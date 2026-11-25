import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Download,
  FileText,
  Info,
  Loader2,
  Play,
  Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { DEMO_SAMPLES } from '../data/demoDatasets.ts';
import {
  BiodiversitySummary,
  computeBiodiversityMetrics,
  ParsedTaxonRecord,
} from '../lib/edna-parser.ts';
import {
  DonutChart,
  RelativeAbundanceBars,
} from '../components/ScientificCharts.tsx';
import { DatasetItem } from './DatasetLibraryPage.tsx';
import { ProjectItem } from './ProjectsPage.tsx';

interface AnalysisPageProps {
  preselectedDatasetId?: string;
  onReportSaved: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  preselectedDatasetId,
  onReportSaved,
}) => {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [refDbs, setRefDbs] = useState<any[]>([]);

  const [sourceMode, setSourceMode] = useState<'workspace' | 'demo'>('workspace');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState(preselectedDatasetId || '');
  const [pipelineName, setPipelineName] = useState('EcoTrace Taxonomic Table & Biodiversity Calculator');

  const [selectedDemoId, setSelectedDemoId] = useState(DEMO_SAMPLES[0].id);
  const [activeAnalysis, setActiveAnalysis] = useState<any | null>(null);
  const [taxa, setTaxa] = useState<ParsedTaxonRecord[]>([]);
  const [taxonLevel, setTaxonLevel] = useState<'Species' | 'Genus' | 'Family' | 'Order' | 'Phylum'>('Species');

  const [running, setRunning] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Table search / sort / pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [rankFilter, setRankFilter] = useState('All');
  const [sortField, setSortField] = useState<'readCount' | 'taxonName' | 'confidenceScore'>('readCount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadWorkspace = useCallback(async () => {
    try {
      const [pRes, dRes, aRes, refRes] = await Promise.all([
        apiFetch<{ projects: ProjectItem[] }>('/api/projects'),
        apiFetch<{ datasets: DatasetItem[] }>('/api/datasets'),
        apiFetch<{ analyses: any[] }>('/api/analyses'),
        fetch('/api/reference-databases').then((r) => r.json()),
      ]);
      setProjects(pRes.projects);
      setDatasets(dRes.datasets);
      setAnalyses(aRes.analyses);
      setRefDbs(refRes.databases || []);

      if (preselectedDatasetId) {
        const ds = dRes.datasets.find((d) => d.id === preselectedDatasetId);
        if (ds) {
          setSelectedProjectId(ds.projectId);
          setSelectedDatasetId(ds.id);
        }
      } else if (dRes.datasets.length > 0 && !selectedDatasetId) {
        setSelectedProjectId(dRes.datasets[0].projectId);
        setSelectedDatasetId(dRes.datasets[0].id);
      } else if (dRes.datasets.length === 0) {
        setSourceMode('demo');
      }

      if (aRes.analyses.length > 0 && !activeAnalysis) {
        const latest = aRes.analyses[0];
        const detail = await apiFetch<{ analysis: any; taxa: ParsedTaxonRecord[] }>(
          `/api/analyses/${latest.id}`
        );
        setActiveAnalysis(detail.analysis);
        setTaxa(detail.taxa);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [apiFetch, preselectedDatasetId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const filteredDatasets = useMemo(
    () =>
      selectedProjectId
        ? datasets.filter((d) => d.projectId === selectedProjectId)
        : datasets,
    [datasets, selectedProjectId]
  );

  const selectedDataset = useMemo(
    () => datasets.find((d) => d.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId]
  );

  const handleRunAnalysis = async () => {
    if (!selectedDatasetId) {
      setError('Please select a dataset to analyze.');
      return;
    }
    setError(null);
    setStatusMsg(null);
    setRunning(true);
    try {
      const res = await apiFetch<{
        analysis: any;
        taxa: ParsedTaxonRecord[];
        warnings?: string[];
      }>('/api/analyses/run', {
        method: 'POST',
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          pipelineName,
        }),
      });
      setActiveAnalysis(res.analysis);
      setTaxa(res.taxa || []);
      setPage(1);
      setStatusMsg(
        res.analysis.status === 'unprocessed'
          ? 'Sequence QC completed. External BLAST/SILVA/BOLD classifier required for taxonomic assignment.'
          : 'eDNA analysis completed and saved to PostgreSQL.'
      );
      await loadWorkspace();
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setRunning(false);
    }
  };

  const handleSelectSavedAnalysis = async (id: string) => {
    setError(null);
    try {
      const detail = await apiFetch<{ analysis: any; taxa: ParsedTaxonRecord[] }>(
        `/api/analyses/${id}`
      );
      setActiveAnalysis(detail.analysis);
      setTaxa(detail.taxa || []);
      setPage(1);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeDemoSample = useMemo(
    () => DEMO_SAMPLES.find((d) => d.id === selectedDemoId) || DEMO_SAMPLES[0],
    [selectedDemoId]
  );

  const displayedTaxa = sourceMode === 'demo' ? activeDemoSample.taxa : taxa;

  const computedMetrics: BiodiversitySummary = useMemo(
    () => computeBiodiversityMetrics(displayedTaxa, taxonLevel),
    [displayedTaxa, taxonLevel]
  );

  const phylumDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of displayedTaxa) {
      const key = t.phylum && t.phylum !== 'Unassigned' ? t.phylum : t.kingdom || 'Unassigned';
      map.set(key, (map.get(key) ?? 0) + t.readCount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [displayedTaxa]);

  const tableRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return displayedTaxa
      .filter((t) => {
        if (rankFilter !== 'All' && t.taxonRank.toLowerCase() !== rankFilter.toLowerCase()) {
          return false;
        }
        if (
          q &&
          !t.taxonName.toLowerCase().includes(q) &&
          !t.family.toLowerCase().includes(q) &&
          !t.phylum.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortField === 'taxonName') return a.taxonName.localeCompare(b.taxonName) * dir;
        if (sortField === 'confidenceScore') {
          return ((a.confidenceScore ?? -1) - (b.confidenceScore ?? -1)) * dir;
        }
        return (a.readCount - b.readCount) * dir;
      });
  }, [displayedTaxa, searchTerm, rankFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const pagedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);

  const exportTaxaCsv = () => {
    const headers = [
      'sequence_identifier',
      'taxon_name',
      'taxon_rank',
      'kingdom',
      'phylum',
      'class',
      'order',
      'family',
      'genus',
      'species',
      'read_count',
      'relative_abundance',
      'confidence_score',
      'reference_database',
      'identification_status',
    ];
    const lines = [
      headers.join(','),
      ...tableRows.map((r) =>
        [
          r.sequenceIdentifier,
          `"${r.taxonName}"`,
          r.taxonRank,
          r.kingdom,
          r.phylum,
          r.className,
          r.orderName,
          r.family,
          r.genus,
          `"${r.species}"`,
          r.readCount,
          r.relativeAbundance,
          r.confidenceScore ?? '',
          `"${r.referenceDatabase}"`,
          `"${r.identificationStatus}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotrace_taxonomy_${sourceMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveReport = async () => {
    if (!activeAnalysis || sourceMode === 'demo') return;
    setSavingReport(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeAnalysis.projectId,
          analysisId: activeAnalysis.id,
          reportName: `Biodiversity Report — ${new Date().toLocaleDateString()}`,
          reportType: 'Biodiversity Assessment',
          summaryData: {
            metrics: computedMetrics,
            taxaCount: displayedTaxa.length,
            pipelineName: activeAnalysis.pipelineName,
          },
        }),
      });
      setStatusMsg('Analysis report saved to your Reports archive.');
      onReportSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            Biodiversity &amp; eDNA Analysis
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Execute validated dataset analyses, inspect taxonomic results, and calculate ecological diversity metrics.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setSourceMode('workspace')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              sourceMode === 'workspace' ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600'
            }`}
          >
            My Datasets ({datasets.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('demo')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              sourceMode === 'demo' ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600'
            }`}
          >
            Demonstration Datasets
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}
      {statusMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {statusMsg}
        </div>
      )}

      {/* Workflow Selector */}
      {sourceMode === 'workspace' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">1. Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  const first = datasets.find((d) => d.projectId === e.target.value);
                  setSelectedDatasetId(first?.id || '');
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">2. Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Select uploaded dataset...</option>
                {filteredDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.fileFormat})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">3. Configured Pipeline</label>
              <select
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                {refDbs.length > 0 ? (
                  refDbs.map((db) => (
                    <option
                      key={db.id}
                      value={db.name}
                      disabled={db.status.includes('External Pipeline Required')}
                    >
                      {db.name} — {db.status}
                    </option>
                  ))
                ) : (
                  <option value="EcoTrace Taxonomic Table & Biodiversity Calculator">
                    EcoTrace Taxonomic Table &amp; Biodiversity Calculator
                  </option>
                )}
              </select>
            </div>

            <button
              type="button"
              disabled={running || !selectedDatasetId}
              onClick={handleRunAnalysis}
              className="py-2 px-4 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run Analysis
                </>
              )}
            </button>
          </div>

          {selectedDataset && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Selected: <strong>{selectedDataset.fileName}</strong> · {selectedDataset.fileFormat} ·{' '}
                {selectedDataset.rowCount} records ·{' '}
                {selectedDataset.metadata?.hasTaxonomicData
                  ? 'Taxonomic columns detected'
                  : 'Raw sequence file (QC inspection)'}
              </span>
              {analyses.length > 0 && (
                <select
                  value={activeAnalysis?.id || ''}
                  onChange={(e) => handleSelectSavedAnalysis(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-[#F7FAF8]"
                >
                  {analyses.map((a) => (
                    <option key={a.id} value={a.id}>
                      Saved Run: {new Date(a.startedAt).toLocaleString()} ({a.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#16A6A1]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#16A6A1] mt-0.5 shrink-0" />
            <div className="text-xs text-slate-700">
              <p className="font-semibold text-[#123B2A]">
                Demonstration Dataset Mode (Explicitly Labeled)
              </p>
              <p className="mt-0.5">
                Inspect validated demonstration eDNA surveys below. Biodiversity indices are mathematically computed from the demonstration taxon read counts.
              </p>
            </div>
          </div>
          <select
            value={selectedDemoId}
            onChange={(e) => {
              setSelectedDemoId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-[#F7FAF8] shrink-0"
          >
            {DEMO_SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                [DEMO] {s.sampleCode} — {s.environment}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Unprocessed Raw FASTA/FASTQ QC Banner */}
      {sourceMode === 'workspace' && activeAnalysis?.status === 'unprocessed' && (
        <div className="bg-white rounded-xl border border-amber-300 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Unprocessed Sequence File — External Taxonomic Classifier Required
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                This file contains raw nucleotide reads without taxonomic assignments. In accordance with scientific integrity standards, EcoTrace does not invent species identities or confidence values. Sequence quality metrics below are measured directly from your file:
              </p>
            </div>
          </div>

          {activeAnalysis.metadata?.sequenceQc && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {[
                { k: 'Total Sequences', v: activeAnalysis.metadata.sequenceQc.sequenceCount },
                { k: 'Total Bases (bp)', v: activeAnalysis.metadata.sequenceQc.totalBases },
                { k: 'Mean Length (bp)', v: activeAnalysis.metadata.sequenceQc.meanLength },
                { k: 'GC Content', v: `${activeAnalysis.metadata.sequenceQc.gcPercent}%` },
                {
                  k: 'Mean Phred Q',
                  v: activeAnalysis.metadata.sequenceQc.meanQualityScore ?? 'N/A (FASTA)',
                },
              ].map((stat) => (
                <div key={stat.k} className="p-3 rounded-lg bg-[#F7FAF8] border border-slate-200">
                  <p className="text-[11px] text-slate-500">{stat.k}</p>
                  <p className="mt-1 font-mono text-base font-semibold text-[#123B2A] tabular-nums">
                    {String(stat.v)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Biodiversity Metrics & Charts */}
      {displayedTaxa.length > 0 && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#123B2A]">
                  Biodiversity Assessment ({taxonLevel} Level)
                </h2>
                <p className="text-xs text-slate-500">
                  Simpson Convention: {computedMetrics.simpsonConvention} · Total Classified Reads:{' '}
                  <span className="font-mono tabular-nums">{computedMetrics.totalReads.toLocaleString()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                  {(['Species', 'Genus', 'Family', 'Order', 'Phylum'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTaxonLevel(lvl)}
                      className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                        taxonLevel === lvl ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                {sourceMode === 'workspace' && activeAnalysis?.status === 'completed' && (
                  <button
                    type="button"
                    disabled={savingReport}
                    onClick={handleSaveReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#21865B] hover:bg-[#123B2A] rounded-lg cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {savingReport ? 'Saving...' : 'Save Report'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { label: 'Taxon Richness (S)', val: computedMetrics.speciesRichness },
                { label: "Shannon Index (H')", val: computedMetrics.shannonIndex.toFixed(4) },
                { label: 'Gini-Simpson (1 - D)', val: computedMetrics.simpsonIndex.toFixed(4) },
                { label: 'Simpson Dominance (D)', val: computedMetrics.simpsonDominance.toFixed(4) },
                { label: 'Inverse Simpson (1 / D)', val: computedMetrics.simpsonInverse.toFixed(3) },
                {
                  label: "Pielou's Evenness (J)",
                  val: computedMetrics.pielouEvenness !== null ? computedMetrics.pielouEvenness.toFixed(4) : 'N/A (S ≤ 1)',
                },
              ].map((m) => (
                <div key={m.label} className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500">{m.label}</p>
                  <p className="mt-1.5 font-mono text-xl font-semibold text-[#123B2A] tabular-nums">
                    {m.val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-white border border-slate-200">
              <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-4">
                Phylum-Level Composition
              </h3>
              <DonutChart data={phylumDistribution} centerLabel="Total Reads" />
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200">
              <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-4">
                Relative Read Abundance (Top Taxa)
              </h3>
              <RelativeAbundanceBars taxa={displayedTaxa} />
            </div>
          </div>

          {/* Taxonomic Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#123B2A]">
                  Taxonomic Identification Results ({tableRows.length})
                </h2>
                <p className="text-xs text-slate-500">
                  {sourceMode === 'demo' ? 'Explicitly labeled Demonstration Dataset' : 'Validated records from dataset'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search taxon or family..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <select
                  value={rankFilter}
                  onChange={(e) => {
                    setRankFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="All">All Ranks</option>
                  <option value="Species">Species</option>
                  <option value="Genus">Genus</option>
                  <option value="Family">Family</option>
                  <option value="Order">Order</option>
                </select>
                <button
                  type="button"
                  onClick={exportTaxaCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#123B2A] border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-3 font-medium">Seq ID</th>
                    <th className="py-2.5 pr-3 font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setSortField('taxonName');
                          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        }}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        Scientific Name
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 pr-3 font-medium">Rank</th>
                    <th className="py-2.5 pr-3 font-medium">Kingdom / Phylum / Family</th>
                    <th className="py-2.5 pr-3 font-medium text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSortField('readCount');
                          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        }}
                        className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                      >
                        Reads
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 pr-3 font-medium text-right">Rel. Abund.</th>
                    <th className="py-2.5 pr-3 font-medium text-right">Confidence</th>
                    <th className="py-2.5 font-medium">Reference / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row, idx) => (
                    <tr key={`${row.sequenceIdentifier}-${row.taxonName}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">
                        {row.sequenceIdentifier || '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-medium italic text-[#123B2A]">
                        {row.taxonName}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{row.taxonRank}</td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {row.kingdom} · {row.phylum} · {row.family}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-800">
                        {row.readCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-700">
                        {(row.relativeAbundance * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-slate-700">
                        {row.confidenceScore !== null ? `${(row.confidenceScore * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {row.referenceDatabase} · {row.identificationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Methodology & Scientific Limitations */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
            <h3 className="font-display text-sm font-semibold text-[#123B2A]">
              Calculation Methodology &amp; Scientific Limitations
            </h3>
            <p>
              <strong>Equations:</strong> Shannon H&apos; = -∑(p_i · ln p_i); Simpson Dominance D = ∑p_i²; Gini-Simpson = 1 - D; Inverse Simpson = 1 / D; Pielou&apos;s Evenness J = H&apos; / ln(S) for S &gt; 1.
            </p>
            <p>
              <strong>Limitations:</strong> eDNA read counts reflect detected genetic fragments and relative amplicon representation rather than exact organism abundance or biomass. Factors such as primer affinity, DNA shedding, transport, and database coverage influence detection probabilities.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
