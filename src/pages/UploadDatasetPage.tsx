import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { detectFileFormat } from '../lib/edna-parser.ts';
import { SAMPLE_DOWNLOAD_CSV, SAMPLE_DOWNLOAD_FASTA } from '../data/demoDatasets.ts';
import { ProjectItem, SampleItem } from './ProjectsPage.tsx';

interface UploadDatasetPageProps {
  preselectedProjectId?: string;
  onProceedToAnalysis: (datasetId: string) => void;
}

export const UploadDatasetPage: React.FC<UploadDatasetPageProps> = ({
  preselectedProjectId,
  onProceedToAnalysis,
}) => {
  const { apiFetch, getToken } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [samples, setSamples] = useState<SampleItem[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [projectId, setProjectId] = useState(preselectedProjectId || '');
  const [sampleId, setSampleId] = useState('');
  const [sampleCode, setSampleCode] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [samplingLocation, setSamplingLocation] = useState('');
  const [environment, setEnvironment] = useState('Freshwater');
  const [collectionDate, setCollectionDate] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [notes, setNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ projects: ProjectItem[] }>('/api/projects'),
      apiFetch<{ samples: SampleItem[] }>('/api/samples'),
    ])
      .then(([p, s]) => {
        setProjects(p.projects);
        setSamples(s.samples);
        if (!projectId && p.projects.length > 0) {
          setProjectId(preselectedProjectId || p.projects[0].id);
        }
      })
      .catch((err) => setError(err.message));
  }, [apiFetch, preselectedProjectId]);

  const projectSamples = samples.filter((s) => s.projectId === projectId);

  const handleFilePick = (file: File | null) => {
    setError(null);
    setUploadedResult(null);
    if (!file) return;

    const fmt = detectFileFormat(file.name);
    if (!fmt) {
      setError('Unsupported file format. Accepted: CSV, TSV, TXT, JSON, FASTA (.fasta/.fa), FASTQ (.fastq/.fq).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum allowed size of 15 MB.');
      return;
    }
    setSelectedFile(file);
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const triggerDownloadSample = (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an eDNA dataset file.');
      return;
    }
    if (!projectId) {
      setError('Please create or select a target project first.');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(25);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required.');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      if (sampleId) formData.append('sampleId', sampleId);
      if (sampleCode) formData.append('sampleCode', sampleCode);
      formData.append('datasetName', datasetName || selectedFile.name);
      formData.append('samplingLocation', samplingLocation);
      formData.append('environment', environment);
      formData.append('collectionDate', collectionDate);
      formData.append('dataSource', dataSource);
      formData.append('notes', notes);

      setProgress(65);
      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Upload failed.');
      }
      setProgress(100);
      setUploadedResult(json);
    } catch (err: any) {
      setError(err.message || 'Dataset upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            Upload eDNA Dataset
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Validate and archive taxonomic abundance tables (CSV, TSV, TXT, JSON) or raw nucleotide files (FASTA, FASTQ).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => triggerDownloadSample(SAMPLE_DOWNLOAD_CSV, 'ecotrace_sample_taxa.csv', 'text/csv')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#123B2A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Sample Taxa CSV
          </button>
          <button
            type="button"
            onClick={() => triggerDownloadSample(SAMPLE_DOWNLOAD_FASTA, 'ecotrace_sample_reads.fasta', 'text/plain')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#123B2A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Sample FASTA
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {projects.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          Create a project in <strong>My Projects</strong> first before uploading an eDNA dataset.
        </div>
      )}

      <form onSubmit={handleUploadSubmit} className="grid lg:grid-cols-12 gap-6">
        {/* Dropzone & Format Spec */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFilePick(e.dataTransfer.files?.[0] || null);
            }}
            className={`p-8 rounded-xl border-2 border-dashed transition-colors text-center bg-white ${
              dragOver ? 'border-[#16A6A1] bg-[#EAF4EF]/40' : 'border-slate-300'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-[#21865B] mx-auto mb-3" />
            <p className="font-display text-sm font-semibold text-[#123B2A]">
              Drag and drop your eDNA file here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              CSV, TSV, TXT, JSON, FASTA, FASTQ · Max 15 MB
            </p>
            <label className="mt-4 inline-block px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg cursor-pointer">
              Browse Local Files
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json,.fasta,.fa,.fna,.fastq,.fq"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              />
            </label>

            {selectedFile && (
              <div className="mt-4 p-3 rounded-lg bg-[#F7FAF8] border border-slate-200 text-left flex items-center gap-3">
                <FileCode2 className="w-5 h-5 text-[#16A6A1] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {detectFileFormat(selectedFile.name)} · {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-[#123B2A]">Pipeline Format Support</p>
            <p>
              <strong>Taxonomic Tables (CSV, TSV, TXT, JSON):</strong> Analyzed directly for taxonomic hierarchy and biodiversity indices (Richness, Shannon, Simpson, Pielou).
            </p>
            <p>
              <strong>Sequence Reads (FASTA, FASTQ):</strong> Validated for read count, base length distribution, GC%, and Phred quality scores. External BLAST/SILVA/BOLD alignment is required for species identification.
            </p>
          </div>
        </div>

        {/* Metadata Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-[#123B2A]">
            Dataset &amp; Sample Metadata
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Project *</label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Dataset Name *</label>
              <input
                type="text"
                required
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="McKenzie Riffle 12S Amplicon Table"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Existing Sample (optional)</label>
              <select
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Create or leave unlinked</option>
                {projectSamples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sampleCode} — {s.sampleName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Sample ID Code (if unlinked)
              </label>
              <input
                type="text"
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
                placeholder="e.g. MCK-01"
                disabled={Boolean(sampleId)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
              >
                {['Freshwater', 'Marine', 'Soil', 'Forest', 'Wetland', 'Air', 'Other'].map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Collection Date</label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sampling Location</label>
              <input
                type="text"
                value={samplingLocation}
                onChange={(e) => setSamplingLocation(e.target.value)}
                placeholder="Coordinates or site name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sequencing / Data Source</label>
              <input
                type="text"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                placeholder="Illumina MiSeq · 12S MiFish"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Field &amp; Lab Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Filtration volume, extraction kit, negative controls..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Validating and storing dataset...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#16A6A1] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={uploading || !selectedFile || !projectId}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload & Validate Dataset'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Post-Upload Dataset Preview */}
      {uploadedResult && (
        <div className="bg-white rounded-xl border border-[#21865B] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#21865B] mt-0.5 shrink-0" />
              <div>
                <h2 className="font-display text-base font-bold text-[#123B2A]">
                  Dataset Validated: {uploadedResult.dataset.name}
                </h2>
                <p className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                  {uploadedResult.dataset.fileName} · {uploadedResult.dataset.fileFormat} ·{' '}
                  {(uploadedResult.dataset.fileSize / 1024).toFixed(1)} KB ·{' '}
                  {uploadedResult.dataset.rowCount} records
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onProceedToAnalysis(uploadedResult.dataset.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Proceed to Analysis →
            </button>
          </div>

          {uploadedResult.parsedSummary?.warnings?.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {uploadedResult.parsedSummary.warnings.join(' ')}
            </div>
          )}

          {uploadedResult.dataset.previewRows?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    {Object.keys(uploadedResult.dataset.previewRows[0]).map((col) => (
                      <th key={col} className="py-2 pr-4 font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {uploadedResult.dataset.previewRows.slice(0, 6).map((row: any, idx: number) => (
                    <tr key={idx}>
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx} className="py-2 pr-4 text-slate-700 whitespace-nowrap max-w-[220px] truncate">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
