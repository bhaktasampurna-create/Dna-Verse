import React, { useState } from 'react';
import {
  BookOpen,
  Database,
  FileSpreadsheet,
  FolderKanban,
  GitCompare,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  Settings,
  Upload,
  User,
  X,
} from 'lucide-react';
import { EcoTraceLogo } from './EcoTraceLogo.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { WorkspaceTab } from '../pages/DashboardOverview.tsx';

interface DashboardShellProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onGoHome: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<any> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'projects', label: 'My Projects', icon: FolderKanban },
  { id: 'upload', label: 'Upload Dataset', icon: Upload },
  { id: 'analysis', label: 'Biodiversity Analysis', icon: Microscope },
  { id: 'taxonomy', label: 'Taxonomic Results', icon: Layers },
  { id: 'comparison', label: 'Sample Comparison', icon: GitCompare },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { id: 'library', label: 'Dataset Library', icon: Database },
  { id: 'profile', label: 'Profile Settings', icon: Settings },
  { id: 'help', label: 'Help & Documentation', icon: BookOpen },
];

export const DashboardShell: React.FC<DashboardShellProps> = ({
  activeTab,
  onSelectTab,
  onGoHome,
  children,
}) => {
  const { appUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Overview';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
        <button type="button" onClick={onGoHome} className="cursor-pointer">
          <EcoTraceLogo size={30} />
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded text-slate-500 hover:bg-slate-100"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                active
                  ? 'bg-[#123B2A] text-white'
                  : 'text-slate-700 hover:bg-[#F7FAF8] hover:text-[#123B2A]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile & Logout (Admin link is NEVER shown to users) */}
      <div className="p-3 border-t border-slate-200 space-y-2">
        <div className="px-2.5 py-2 rounded-lg bg-[#F7FAF8] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#123B2A] text-white flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {appUser?.fullName || 'Researcher'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{appUser?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('profile');
              setSidebarOpen(false);
            }}
            className="py-2 px-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button
            type="button"
            onClick={logout}
            className="py-2 px-2.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen no-print">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 h-full">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 truncate">
              <span>EcoTrace</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-[#123B2A]">{activeLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('upload')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            New Dataset
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
