import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Database,
  FileSpreadsheet,
  FolderKanban,
  Info,
  Microscope,
  TestTube2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { DEMO_SAMPLES } from '../data/demoDatasets.ts';
import {
  BarComparisonChart,
  BiodiversityLineChart,
  DonutChart,
} from '../components/ScientificCharts.tsx';

export type WorkspaceTab =
  | 'overview'
  | 'projects'
  | 'upload'
  | 'analysis'
  | 'taxonomy'
  | 'comparison'
  | 'reports'
  | 'library'
  | 'profile'
  | 'help';

interface DashboardOverviewProps {
  onNavigate: (tab: WorkspaceTab) => void;
}

interface DashboardPayload {
  stats: {
    totalProjects: number;
    totalSamples: number;
    totalDatasets: number;
    completedAnalyses: number;
    identifiedTaxa: number;
    totalReports: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    environmentType: string;
    status: string;
    sampleCount: number;
    datasetCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
  taxonomicDistribution: Array<{ name: string; reads: number }>;
  metricsSeries: Array<{
    id: string;
    analysisId: string;
    speciesRichness: number;
    shannonIndex: number;
    simpsonIndex: number;
    pielouEvenness: number | null;
    totalReads: number;
    createdAt: string;
  }>;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { appUser, apiFetch, demoMode, setDemoMode } = useAuth();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<DashboardPayload>('/api/dashboard')
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load dashboard statistics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const hasRealData = (data?.stats.completedAnalyses ?? 0) > 0 || (data?.stats.totalProjects ?? 0) > 0;
  const showingDemo = demoMode || (!loading && !hasRealData);

  // Build visualization datasets (either real saved DB records or explicitly labeled demonstration data)
  const demoPhylumMap = new Map<string, number>();
  DEMO_SAMPLES.forEach((s) =>
    s.taxa.forEach((t) => {
      demoPhylumMap.set(t.phylum, (demoPhylumMap.get(t.phylum) ?? 0) + t.readCount);
    })
  );

  const donutData = showingDemo
    ? Array.from(demoPhylumMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : (data?.taxonomicDistribution || []).map((d) => ({ name: d.name, value: d.reads }));

  const richnessBars = showingDemo
    ? DEMO_SAMPLES.map((s) => ({
        label: s.sampleCode,
        sublabel: s.environment,
        value: s.metrics.speciesRichness,
      }))
    : (data?.metricsSeries || []).map((m, idx) => ({
        label: `Analysis ${idx + 1}`,
        sublabel: `${m.totalReads} reads`,
        value: m.speciesRichness,
      }));

  const indexSeries = showingDemo
    ? DEMO_SAMPLES.map((s) => ({
        label: s.sampleCode,
        shannon: s.metrics.shannonIndex,
        simpson: s.metrics.simpsonIndex,
      }))
    : (data?.metricsSeries || []).map((m, idx) => ({
        label: `Run ${idx + 1}`,
        shannon: m.shannonIndex,
        simpson: m.simpsonIndex,
      }));

  const comparisonBars = showingDemo
    ? DEMO_SAMPLES.map((s) => ({
        label: s.sampleCode,
        sublabel: `H'=${s.metrics.shannonIndex.toFixed(2)}`,
        value: s.metrics.simpsonIndex,
      }))
    : (data?.metricsSeries || []).map((m, idx) => ({
        label: `Run ${idx + 1}`,
        sublabel: `H'=${m.shannonIndex.toFixed(2)}`,
        value: m.simpsonIndex,
      }));

  const statCards = [
    {
      label: 'Total Projects',
      value: data?.stats.totalProjects ?? 0,
      icon: FolderKanban,
    },
    {
      label: 'Total Samples',
      value: data?.stats.totalSamples ?? 0,
      icon: TestTube2,
    },
    {
      label: 'Total Datasets',
      value: data?.stats.totalDatasets ?? 0,
      icon: Database,
    },
    {
      label: 'Completed Analyses',
      value: data?.stats.completedAnalyses ?? 0,
      icon: Microscope,
    },
    {
      label: 'Identified Taxa',
      value: data?.stats.identifiedTaxa ?? 0,
      icon: Activity,
    },
    {
      label: 'Saved Reports',
      value: data?.stats.totalReports ?? 0,
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#123B2A]">
            Welcome back, {appUser?.fullName || 'Researcher'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Explore your biodiversity research and environmental DNA analyses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setDemoMode(false)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                !demoMode ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Workspace
            </button>
            <button
              type="button"
              onClick={() => setDemoMode(true)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                demoMode ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demo Mode
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload eDNA Dataset
          </button>
        </div>
      </div>

      {/* Explicit Demo Mode Notice */}
      {showingDemo && (
        <div className="p-4 rounded-xl bg-white border border-[#16A6A1]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#16A6A1] mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm text-slate-700">
              <span className="font-semibold text-[#123B2A]">
                Demonstration Mode Active{!hasRealData && !demoMode ? ' (No saved analyses yet)' : ''}:
              </span>{' '}
              Charts below visualize curated reference demonstration samples ({DEMO_SAMPLES.map((s) => s.sampleCode).join(', ')}). Stat cards reflect your real PostgreSQL workspace totals.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="text-xs font-semibold text-[#21865B] hover:text-[#123B2A] inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            Create Real Project
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Database Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">{card.label}</span>
                <Icon className="w-4 h-4 text-[#21865B]" />
              </div>
              <div className="mt-3 font-mono text-2xl font-semibold text-[#123B2A] tabular-nums">
                {loading ? '—' : card.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualizations Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#123B2A]">
                Taxonomic Distribution by Phylum
              </h2>
              <p className="text-xs text-slate-500">
                {showingDemo ? 'Demonstration Dataset · Read proportions' : 'Aggregated from saved analyses'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('taxonomy')}
              className="text-xs font-medium text-[#21865B] hover:underline cursor-pointer"
            >
              Open Explorer
            </button>
          </div>
          <DonutChart data={donutData} centerLabel="Classified Reads" />
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#123B2A]">
                Species Richness Overview (S)
              </h2>
              <p className="text-xs text-slate-500">
                {showingDemo ? 'Demonstration Dataset · Unique species per sample' : 'Unique detected species per run'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="text-xs font-medium text-[#21865B] hover:underline cursor-pointer"
            >
              Analyze Dataset
            </button>
          </div>
          <BarComparisonChart data={richnessBars} decimals={0} color="#21865B" />
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-[#123B2A]">
              Biodiversity Index Profile (H&apos; vs 1 - D)
            </h2>
            <p className="text-xs text-slate-500">
              {showingDemo ? 'Demonstration Dataset · Shannon & Gini-Simpson indices' : 'Saved analysis metrics'}
            </p>
          </div>
          <BiodiversityLineChart data={indexSeries} />
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#123B2A]">
                Sample Diversity Comparison (Simpson 1 - D)
              </h2>
              <p className="text-xs text-slate-500">
                {showingDemo ? 'Demonstration Dataset · Cross-biome comparison' : 'Cross-sample Simpson diversity'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('comparison')}
              className="text-xs font-medium text-[#21865B] hover:underline cursor-pointer"
            >
              Compare Samples
            </button>
          </div>
          <BarComparisonChart data={comparisonBars} decimals={3} color="#16A6A1" />
        </div>
      </div>

      {/* Recent Projects & Activity */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-[#123B2A]">
              Recent Projects
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-medium text-[#21865B] hover:underline cursor-pointer"
            >
              View all projects
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (data?.recentProjects.length ?? 0) === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">
                You haven&apos;t created any eDNA research projects yet.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] cursor-pointer"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2.5 font-medium">Project</th>
                    <th className="pb-2.5 font-medium">Environment</th>
                    <th className="pb-2.5 font-medium text-right">Samples</th>
                    <th className="pb-2.5 font-medium text-right">Updated</th>
                    <th className="pb-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recentProjects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900">{proj.name}</td>
                      <td className="py-3 text-slate-600">
                        {proj.environmentType} · {proj.status}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-slate-700">
                        {proj.sampleCount}
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-slate-500">
                        {new Date(proj.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('projects')}
                          className="font-medium text-[#21865B] hover:text-[#123B2A] cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-slate-200">
          <h2 className="font-display text-base font-semibold text-[#123B2A] mb-4">
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (data?.recentActivity.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Project creation, dataset uploads, analyses, and reports will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {data?.recentActivity.slice(0, 6).map((act) => (
                <div key={act.id} className="pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-800">{act.title}</p>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {act.description && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{act.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
