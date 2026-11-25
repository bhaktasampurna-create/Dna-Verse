import React, { useEffect, useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { DEMO_SAMPLES } from '../data/demoDatasets.ts';
import { computeBiodiversityMetrics, ParsedTaxonRecord } from '../lib/edna-parser.ts';
import { BarComparisonChart } from '../components/ScientificCharts.tsx';

interface ComparableSample {
  id: string;
  label: string;
  environment: string;
  location: string;
  isDemo: boolean;
  taxa: ParsedTaxonRecord[];
}

export const SampleComparisonPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [workspaceSamples, setWorkspaceSamples] = useState<ComparableSample[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([
    DEMO_SAMPLES[0].id,
    DEMO_SAMPLES[1].id,
  ]);

  useEffect(() => {
    apiFetch<{ analyses: any[] }>('/api/analyses')
      .then(async (res) => {
        const completed = res.analyses.filter((a) => a.status === 'completed').slice(0, 6);
        const loaded: ComparableSample[] = [];
        for (const item of completed) {
          const detail = await apiFetch<{ taxa: ParsedTaxonRecord[] }>(`/api/analyses/${item.id}`);
          if (detail.taxa.length > 0) {
            loaded.push({
              id: item.id,
              label: `Run ${new Date(item.startedAt).toLocaleDateString()} (${item.pipelineName.slice(0, 22)})`,
              environment: item.metadata?.format || 'Dataset',
              location: 'Saved Workspace Analysis',
              isDemo: false,
              taxa: detail.taxa,
            });
          }
        }
        setWorkspaceSamples(loaded);
        if (loaded.length >= 2) {
          setSelectedIds([loaded[0].id, loaded[1].id]);
        }
      })
      .catch(() => {});
  }, [apiFetch]);

  const allCandidates: ComparableSample[] = useMemo(
    () => [
      ...workspaceSamples,
      ...DEMO_SAMPLES.map((d) => ({
        id: d.id,
        label: `[DEMO] ${d.sampleCode} — ${d.sampleName}`,
        environment: d.environment,
        location: d.location,
        isDemo: true,
        taxa: d.taxa,
      })),
    ],
    [workspaceSamples]
  );

  const selectedSamples = useMemo(
    () => allCandidates.filter((c) => selectedIds.includes(c.id)),
    [allCandidates, selectedIds]
  );

  const toggleSample = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const sampleMetrics = useMemo(
    () =>
      selectedSamples.map((s) => ({
        sample: s,
        metrics: computeBiodiversityMetrics(s.taxa, 'Species'),
        taxonSet: new Set(s.taxa.map((t) => t.taxonName)),
      })),
    [selectedSamples]
  );

  const taxonPresence = useMemo(() => {
    const allTaxa = new Set<string>();
    sampleMetrics.forEach((sm) => sm.taxonSet.forEach((name) => allTaxa.add(name)));
    const shared: string[] = [];
    const uniqueBySample = new Map<string, string[]>();

    for (const taxon of allTaxa) {
      const presentIn = sampleMetrics.filter((sm) => sm.taxonSet.has(taxon));
      if (presentIn.length === sampleMetrics.length && sampleMetrics.length > 1) {
        shared.push(taxon);
      } else if (presentIn.length === 1) {
        const sid = presentIn[0].sample.id;
        uniqueBySample.set(sid, [...(uniqueBySample.get(sid) || []), taxon]);
      }
    }
    return { shared: shared.sort(), uniqueBySample };
  }, [sampleMetrics]);

  const exportComparisonCsv = () => {
    const headers = [
      'sample',
      'environment',
      'is_demo',
      'species_richness',
      'total_reads',
      'shannon_index',
      'simpson_1_minus_d',
      'pielou_evenness',
    ];
    const rows = sampleMetrics.map(({ sample, metrics }) =>
      [
        `"${sample.label}"`,
        sample.environment,
        sample.isDemo,
        metrics.speciesRichness,
        metrics.totalReads,
        metrics.shannonIndex,
        metrics.simpsonIndex,
        metrics.pielouEvenness ?? '',
      ].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotrace_sample_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            Sample Comparison
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Compare taxonomic composition, diversity indices, shared taxa, and unique detections across samples.
          </p>
        </div>

        <button
          type="button"
          disabled={sampleMetrics.length === 0}
          onClick={exportComparisonCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#123B2A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          Export Comparison CSV
        </button>
      </div>

      {/* Sample Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-[#123B2A]">
          Select Samples to Compare ({selectedSamples.length} selected)
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {allCandidates.map((cand) => {
            const checked = selectedIds.includes(cand.id);
            return (
              <label
                key={cand.id}
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                  checked ? 'border-[#123B2A] bg-[#F7FAF8]' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSample(cand.id)}
                  className="mt-0.5 rounded border-slate-300 text-[#123B2A]"
                />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{cand.label}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {cand.environment} · {cand.location}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {sampleMetrics.some((s) => s.sample.isDemo) && (
        <div className="p-3.5 rounded-lg bg-white border border-[#16A6A1]/40 text-xs text-slate-700 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#16A6A1] shrink-0" />
          <span>
            Samples prefixed with <strong>[DEMO]</strong> are curated demonstration datasets provided for comparison exploration.
          </span>
        </div>
      )}

      {sampleMetrics.length > 0 && (
        <>
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-3">
                Species Richness (S) Comparison
              </h3>
              <BarComparisonChart
                data={sampleMetrics.map((sm) => ({
                  label: sm.sample.label.replace('[DEMO] ', '').slice(0, 18),
                  sublabel: sm.sample.environment,
                  value: sm.metrics.speciesRichness,
                }))}
                decimals={0}
                color="#21865B"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-3">
                Shannon Diversity Index (H&apos;) Comparison
              </h3>
              <BarComparisonChart
                data={sampleMetrics.map((sm) => ({
                  label: sm.sample.label.replace('[DEMO] ', '').slice(0, 18),
                  sublabel: `1-D = ${sm.metrics.simpsonIndex.toFixed(3)}`,
                  value: sm.metrics.shannonIndex,
                }))}
                decimals={3}
                color="#16A6A1"
              />
            </div>
          </div>

          {/* Metrics Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-x-auto">
            <h3 className="font-display text-sm font-semibold text-[#123B2A] mb-3">
              Biodiversity Metrics Matrix
            </h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Sample</th>
                  <th className="py-2.5 pr-4 font-medium">Environment</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Richness (S)</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Reads</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Shannon (H&apos;)</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Simpson (1 - D)</th>
                  <th className="py-2.5 font-medium text-right">Evenness (J)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sampleMetrics.map(({ sample, metrics }) => (
                  <tr key={sample.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{sample.label}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{sample.environment}</td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {metrics.speciesRichness}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {metrics.totalReads.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {metrics.shannonIndex.toFixed(4)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                      {metrics.simpsonIndex.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {metrics.pielouEvenness !== null ? metrics.pielouEvenness.toFixed(4) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shared vs Unique Taxa */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-sm font-semibold text-[#123B2A]">
                Shared Taxa Across All Selected Samples ({taxonPresence.shared.length})
              </h3>
              {taxonPresence.shared.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  No taxa are shared across all currently selected samples.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-xs italic text-slate-800">
                  {taxonPresence.shared.map((t) => (
                    <li key={t} className="py-1 border-b border-slate-100 last:border-b-0">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold text-[#123B2A]">
                Sample-Unique Taxa
              </h3>
              {sampleMetrics.map(({ sample }) => {
                const uniq = taxonPresence.uniqueBySample.get(sample.id) || [];
                return (
                  <div key={sample.id} className="pb-2.5 border-b border-slate-100 last:border-b-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {sample.label} ({uniq.length})
                    </p>
                    <p className="mt-1 text-xs italic text-slate-600">
                      {uniq.length > 0 ? uniq.join(', ') : 'None'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
