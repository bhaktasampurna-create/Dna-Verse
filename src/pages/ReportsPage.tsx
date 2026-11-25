import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Printer, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { EcoTraceLogo } from '../components/EcoTraceLogo.tsx';
import { DEMO_SAMPLES } from '../data/demoDatasets.ts';

interface SavedReport {
  id: string;
  projectId: string;
  analysisId: string | null;
  reportName: string;
  reportType: string;
  summaryData: Record<string, any>;
  createdAt: string;
}

export const ReportsPage: React.FC = () => {
  const { apiFetch, appUser } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [selectedTaxa, setSelectedTaxa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ reports: SavedReport[] }>('/api/reports');
      setReports(res.reports);
      if (res.reports.length > 0 && !selectedReport) {
        await inspectReport(res.reports[0]);
      }
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const inspectReport = async (rep: SavedReport) => {
    setSelectedReport(rep);
    if (rep.analysisId) {
      try {
        const detail = await apiFetch<{ taxa: any[] }>(`/api/analyses/${rep.analysisId}`);
        setSelectedTaxa(detail.taxa || []);
      } catch {
        setSelectedTaxa([]);
      }
    } else {
      setSelectedTaxa([]);
    }
  };

  const inspectDemoReport = () => {
    const demo = DEMO_SAMPLES[0];
    setSelectedReport({
      id: 'demo-report',
      projectId: demo.projectId,
      analysisId: null,
      reportName: `[DEMO] ${demo.projectName}`,
      reportType: 'Demonstration Biodiversity Assessment',
      createdAt: new Date().toISOString(),
      summaryData: {
        metrics: demo.metrics,
        pipelineName: 'EcoTrace Taxonomic Table & Biodiversity Calculator (Demo)',
        sampleDetails: `${demo.sampleName} (${demo.sampleCode}) · ${demo.location}`,
        referenceDatabase: demo.referenceDatabase,
      },
    });
    setSelectedTaxa(demo.taxa);
  };

  const handleDelete = async (id: string) => {
    if (id === 'demo-report') return;
    await apiFetch(`/api/reports/${id}`, { method: 'DELETE' });
    setSelectedReport(null);
    setSelectedTaxa([]);
    await loadReports();
  };

  const downloadCsv = () => {
    if (!selectedReport) return;
    const headers = ['scientific_name', 'rank', 'phylum', 'family', 'read_count', 'relative_abundance'];
    const lines = [
      `# EcoTrace Report: ${selectedReport.reportName}`,
      `# Generated: ${new Date(selectedReport.createdAt).toISOString()}`,
      headers.join(','),
      ...selectedTaxa.map((t) =>
        [`"${t.taxonName}"`, t.taxonRank, t.phylum, t.family, t.readCount, t.relativeAbundance].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport.reportName.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = selectedReport?.summaryData?.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            Research Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review archived biodiversity reports, export CSV summaries, or print publication-ready PDFs.
          </p>
        </div>

        <button
          type="button"
          onClick={inspectDemoReport}
          className="px-4 py-2 text-xs font-semibold text-[#123B2A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          Preview Demonstration Report
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Saved List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-3 no-print h-fit">
          <h2 className="font-display text-sm font-semibold text-[#123B2A]">
            Saved Reports ({reports.length})
          </h2>
          {loading ? (
            <p className="text-xs text-slate-500 py-4">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No saved reports yet. Run an analysis and click &ldquo;Save Report&rdquo;, or preview the demonstration report.
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => inspectReport(r)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start justify-between gap-2 ${
                    selectedReport?.id === r.id
                      ? 'border-[#123B2A] bg-[#F7FAF8]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{r.reportName}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString()} · {r.reportType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    aria-label="Delete report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Printable Report Preview */}
        <div className="lg:col-span-8">
          {!selectedReport ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Select a saved report or click &ldquo;Preview Demonstration Report&rdquo;.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-7 space-y-6 print-only-container">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <EcoTraceLogo size={30} />
                  <h2 className="mt-3 font-display text-xl font-bold text-[#123B2A]">
                    {selectedReport.reportName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedReport.reportType} · Generated {new Date(selectedReport.createdAt).toLocaleString()} · Author: {appUser?.fullName || 'Researcher'}
                  </p>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={downloadCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#123B2A] border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>
                </div>
              </div>

              {selectedReport.summaryData?.sampleDetails && (
                <div className="text-xs text-slate-700">
                  <strong>Sample Metadata:</strong> {selectedReport.summaryData.sampleDetails}
                </div>
              )}

              {metrics && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-3">
                    Biodiversity Summary ({metrics.taxonLevel || 'Species'} Level)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-[#F7FAF8] border border-slate-200">
                      <p className="text-[11px] text-slate-500">Species Richness (S)</p>
                      <p className="font-mono text-lg font-semibold text-[#123B2A] tabular-nums">
                        {metrics.speciesRichness}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7FAF8] border border-slate-200">
                      <p className="text-[11px] text-slate-500">Shannon Index (H&apos;)</p>
                      <p className="font-mono text-lg font-semibold text-[#123B2A] tabular-nums">
                        {Number(metrics.shannonIndex).toFixed(4)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F7FAF8] border border-slate-200">
                      <p className="text-[11px] text-slate-500">Gini-Simpson (1 - D)</p>
                      <p className="font-mono text-lg font-semibold text-[#123B2A] tabular-nums">
                        {Number(metrics.simpsonIndex).toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTaxa.length > 0 && (
                <div>
                  <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-2">
                    Taxonomic Detections ({selectedTaxa.length})
                  </h3>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3 font-medium">Scientific Name</th>
                        <th className="py-2 pr-3 font-medium">Phylum · Family</th>
                        <th className="py-2 pr-3 font-medium text-right">Reads</th>
                        <th className="py-2 font-medium text-right">Rel. Abundance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTaxa.slice(0, 20).map((t, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 italic font-medium text-slate-900">{t.taxonName}</td>
                          <td className="py-2 pr-3 text-slate-600">{t.phylum} · {t.family}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{t.readCount}</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {(t.relativeAbundance * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p>
                  <strong>Processing Method:</strong> {selectedReport.summaryData?.pipelineName || 'EcoTrace Biodiversity Engine'}
                </p>
                <p>
                  <strong>Data Limitations:</strong> eDNA read counts represent relative amplicon detections and do not guarantee live biomass or absolute population density.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
