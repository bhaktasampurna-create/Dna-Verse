import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthPages } from './pages/AuthPages.tsx';
import { DashboardShell } from './components/DashboardShell.tsx';
import { DashboardOverview, WorkspaceTab } from './pages/DashboardOverview.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { UploadDatasetPage } from './pages/UploadDatasetPage.tsx';
import { DatasetLibraryPage } from './pages/DatasetLibraryPage.tsx';
import { AnalysisPage } from './pages/AnalysisPage.tsx';
import { TaxonomicExplorerPage } from './pages/TaxonomicExplorerPage.tsx';
import { SampleComparisonPage } from './pages/SampleComparisonPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage.tsx';
import { HelpDocsPage } from './pages/HelpDocsPage.tsx';
import { AdminControlPage } from './pages/AdminControlPage.tsx';

function EcoTraceRouter() {
  const { firebaseUser, appUser, loading, syncError, setDemoMode, logout } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname || '/');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [preselectedProjectId, setPreselectedProjectId] = useState<string | undefined>();
  const [preselectedDatasetId, setPreselectedDatasetId] = useState<string | undefined>();

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setPathname(path);
    window.scrollTo(0, 0);
  };

  if (pathname === '/secure-control') {
    return <AdminControlPage onBack={() => navigate(firebaseUser ? '/dashboard' : '/')} />;
  }

  if (loading && (pathname === '/dashboard' || pathname === '/login' || pathname === '/register')) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#123B2A]" />
      </div>
    );
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    if (firebaseUser && appUser) {
      navigate('/dashboard');
      return null;
    }
    const mode =
      pathname === '/register' ? 'register' : pathname === '/forgot-password' ? 'forgot' : 'login';
    return (
      <AuthPages
        initialMode={mode}
        onBackHome={() => navigate('/')}
        onSuccess={() => navigate('/dashboard')}
      />
    );
  }

  if (pathname === '/dashboard') {
    if (!firebaseUser) {
      return (
        <AuthPages
          initialMode="login"
          onBackHome={() => navigate('/')}
          onSuccess={() => navigate('/dashboard')}
        />
      );
    }

    if (syncError) {
      return (
        <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-6 text-center space-y-4">
            <h1 className="font-display text-lg font-bold text-slate-900">Account Access Issue</h1>
            <p className="text-sm text-rose-700">{syncError}</p>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] rounded-lg cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <DashboardShell
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onGoHome={() => navigate('/')}
      >
        {activeTab === 'overview' && <DashboardOverview onNavigate={setActiveTab} />}
        {activeTab === 'projects' && (
          <ProjectsPage
            onGoUpload={(pid) => {
              setPreselectedProjectId(pid);
              setActiveTab('upload');
            }}
          />
        )}
        {activeTab === 'upload' && (
          <UploadDatasetPage
            preselectedProjectId={preselectedProjectId}
            onProceedToAnalysis={(did) => {
              setPreselectedDatasetId(did);
              setActiveTab('analysis');
            }}
          />
        )}
        {activeTab === 'library' && (
          <DatasetLibraryPage
            onAnalyzeDataset={(did) => {
              setPreselectedDatasetId(did);
              setActiveTab('analysis');
            }}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisPage
            preselectedDatasetId={preselectedDatasetId}
            onReportSaved={() => setActiveTab('reports')}
          />
        )}
        {activeTab === 'taxonomy' && <TaxonomicExplorerPage />}
        {activeTab === 'comparison' && <SampleComparisonPage />}
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'profile' && <ProfileSettingsPage />}
        {activeTab === 'help' && <HelpDocsPage />}
      </DashboardShell>
    );
  }

  return (
    <LandingPage
      isAuthenticated={Boolean(firebaseUser)}
      onNavigateAuth={(mode) => navigate(mode === 'register' ? '/register' : '/login')}
      onEnterWorkspace={(demo) => {
        if (demo) setDemoMode(true);
        navigate('/dashboard');
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <EcoTraceRouter />
    </AuthProvider>
  );
}
