import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Loader2, Play, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

export interface DatasetItem {
  id: string;
  projectId: string;
  sampleId: string | null;
  name: string;
  fileName: string;
  fileFormat: string;
  fileSize: number;
  rowCount: number;
  sequenceCount: number;
  previewRows: Record<string, unknown>[];
  metadata: Record<string, any>;
  uploadStatus: string;
  createdAt: string;
}

export const DatasetLibraryPage: React.FC<{
  onAnalyzeDataset: (datasetId: string) => void;
}> = ({ onAnalyzeDataset }) => {
  const { apiFetch, getToken } = useAuth();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [previewTarget, setPreviewTarget] = useState<DatasetItem | null>(null);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ datasets: DatasetItem[] }>('/api/datasets');
      setDatasets(res.datasets);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleDownload = async (ds: DatasetItem) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/datasets/${ds.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ds.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/datasets/${id}`, { method: 'DELETE' });
      if (previewTarget?.id === id) setPreviewTarget(null);
      await loadDatasets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return datasets.filter((d) => {
      if (formatFilter !== 'All' && d.fileFormat !== formatFilter) return false;
      if (q && !d.name.toLowerCase().includes(q) && !d.fileName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [datasets, search, formatFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#123B2A]">
          Dataset Library
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect, download, analyze, or remove uploaded eDNA sequence and taxonomic datasets.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets by title or filename..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
        >
          <option value="All">All Formats</option>
          {['CSV', 'TSV', 'TXT', 'JSON', 'FASTA', 'FASTQ'].map((fmt) => (
            <option key={fmt} value={fmt}>{fmt}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#21865B]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No datasets uploaded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F7FAF8] text-slate-500">
                  <th className="py-3 px-4 font-medium">Dataset Name</th>
                  <th className="py-3 px-4 font-medium">Format</th>
                  <th className="py-3 px-4 font-medium text-right">Records</th>
                  <th className="py-3 px-4 font-medium text-right">Size</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Uploaded</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{ds.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{ds.fileName}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{ds.fileFormat}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {ds.rowCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {(ds.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ds.uploadStatus === 'validated' ? 'Taxonomic Table Ready' : 'Sequence QC Ready'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {new Date(ds.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAnalyzeDataset(ds.id)}
                          title="Run analysis"
                          className="p-1.5 rounded text-[#21865B] hover:bg-emerald-50 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(ds)}
                          title="Preview records"
                          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(ds)}
                          title="Download raw file"
                          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ds.id)}
                          title="Delete dataset"
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-display text-base font-bold text-[#123B2A]">
                  {previewTarget.name}
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  {previewTarget.fileName} · {previewTarget.fileFormat} · {previewTarget.rowCount} records
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 overflow-auto flex-1">
              {previewTarget.previewRows?.length > 0 ? (
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      {Object.keys(previewTarget.previewRows[0]).map((c) => (
                        <th key={c} className="py-2 pr-4 font-medium whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewTarget.previewRows.map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} className="py-2 pr-4 text-slate-700 whitespace-nowrap max-w-[260px] truncate">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">No preview rows recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
