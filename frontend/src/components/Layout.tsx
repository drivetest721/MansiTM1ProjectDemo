import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Wallet,
  LineChart,
  FileText,
  Scale,
  Globe,
  Box,
  Database,
  Network,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Server,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const analyticsItems = [
  { path: '/', label: 'Executive Overview', icon: LayoutDashboard },
  { path: '/revenue-planning', label: 'Product Financial Analysis', icon: TrendingUp },
  { path: '/workforce-planning', label: 'Workforce Reporting', icon: Users },
  { path: '/cfo-budgeting', label: 'CFO Budgeting', icon: Wallet },

  { path: '/pl-statement', label: 'P&L Statement', icon: FileText },
  { path: '/balance-sheet', label: 'Balance Sheet', icon: Scale },
];

const consolidationItems = [
  { path: '/tm1-architecture', label: 'TM1 Architecture', icon: Network },
  { path: '/dimension-explorer', label: 'Dimension Explorer', icon: Database },
  { path: '/cube-explorer', label: 'Cube Explorer', icon: Box },
  { path: '/financial-consolidation', label: 'Financial Consolidation', icon: Globe },
  { path: '/admin-data-health', label: 'Admin / Data Health', icon: Settings },
];

function NavGroup({
  label,
  icon: GroupIcon,
  items,
  currentPath,
  defaultOpen = true,
  onNavigate,
  collapsed,
}: {
  label: string;
  icon: React.ElementType;
  items: { path: string; label: string; icon: React.ElementType }[];
  currentPath: string;
  defaultOpen?: boolean;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  // Keep this state local to the group so each section toggles independently.
  const [open, setOpen] = useState(defaultOpen);

  // When the sidebar itself is collapsed (icon-only rail), we always show
  // the flat icon list and skip the group header entirely — there's no
  // room to render "Analytics & Reporting" text anyway.
  if (collapsed) {
    return (
      <div className="mb-1 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path);

          return (
            <a
              key={item.path}
              href={item.path}
              title={item.label}
              onClick={(e) => {
                e.preventDefault();
                onNavigate();
                window.location.href = item.path;
              }}
              className={`flex items-center justify-center p-2.5 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
          text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors text-xs font-semibold uppercase tracking-wider"
      >
        <GroupIcon size={15} className="flex-shrink-0" />
        <span className="flex-1 truncate text-[14px]">{label}</span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path);

            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate();

                  // Hard refresh — full page reload on every navigation
                  window.location.href = item.path;
                }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="text-sm truncate">{item.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  // Hard-refresh means router state is gone — read path directly from browser
  const currentPath = window.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop "rail" collapse: shrinks sidebar to icon-only and widens content.
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 72 : 300;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/10">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TM1 Enterprise Portal
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Planning Analytics Performance Management
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)]
            bg-white dark:bg-gray-800
            border-r border-gray-200 dark:border-gray-700
            transition-[width,transform] duration-300 z-30
            flex-shrink-0
            overflow-y-auto overflow-x-hidden
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        >
          <nav className="p-3 space-y-2">
            <NavGroup
              label="Financial Consolidation"
              icon={Server}
              items={consolidationItems}
              currentPath={currentPath}
              defaultOpen={true}
              onNavigate={() => setSidebarOpen(false)}
              collapsed={collapsed}
            />
            
            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
            
            
            <NavGroup
              label="Analytics & Reporting"
              icon={BarChart2}
              items={analyticsItems}
              currentPath={currentPath}
              defaultOpen={true}
              onNavigate={() => setSidebarOpen(false)}
              collapsed={collapsed}
            />


          </nav>

          {/* Collapse / expand toggle — sits on the sidebar's edge, vertically centered */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex items-center justify-center
              absolute top-1/2 -translate-y-1/2 -right-3
              w-8 h-8 rounded-full
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700
              text-gray-500 dark:text-gray-300
              transition-all z-40"
          >
            {collapsed ? <ChevronRight size={32} /> : <ChevronLeft size={32} />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}