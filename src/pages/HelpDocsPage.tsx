import React from 'react';
import { BookOpen, Database, FileSpreadsheet, Microscope, ShieldAlert } from 'lucide-react';

export const HelpDocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#123B2A]">
          Help &amp; Scientific Documentation
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Reference guide for eDNA dataset schemas, ecological diversity formulas, and platform integrations.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-[#123B2A] flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#21865B]" />
          1. Supported eDNA File Formats
        </h2>
        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            <strong>CSV / TSV / TXT / JSON (Taxonomic Abundance Tables):</strong> Include columns such as{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">scientific_name</code> (or{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">species</code>),{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">kingdom</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">phylum</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">class</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">order</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">family</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">genus</code>,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">read_count</code>, and{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded">confidence_score</code>.
          </p>
          <p>
            <strong>FASTA / FASTQ (Raw Sequence Files):</strong> Parsed for sequence counts, total base pairs, read length distribution, GC%, and mean Phred quality score (FASTQ). Raw sequence files require an external reference alignment worker (NCBI BLAST+, SILVA, or BOLD) before taxonomic labels can be assigned.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-[#123B2A] flex items-center gap-2">
          <Microscope className="w-4 h-4 text-[#21865B]" />
          2. Biodiversity Calculation Formulas
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200">
            <p className="font-semibold text-[#123B2A]">Shannon Diversity Index (H&apos;)</p>
            <p className="mt-1 font-mono text-[#16A6A1]">H&apos; = -∑ (p_i · ln(p_i))</p>
            <p className="mt-1">Calculated using natural logarithm (base e) over relative read proportions p_i = n_i / N.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200">
            <p className="font-semibold text-[#123B2A]">Simpson Diversity Indices</p>
            <p className="mt-1 font-mono text-[#16A6A1]">D = ∑ p_i² · Gini-Simpson = 1 - D · Inv = 1/D</p>
            <p className="mt-1">All three conventions are displayed explicitly side-by-side so conventions are never mixed.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200">
            <p className="font-semibold text-[#123B2A]">Pielou&apos;s Evenness (J)</p>
            <p className="mt-1 font-mono text-[#16A6A1]">J = H&apos; / ln(S)</p>
            <p className="mt-1">Ranges 0 to 1. Reported as N/A when Species Richness S ≤ 1 to avoid division by zero.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200">
            <p className="font-semibold text-[#123B2A]">Species Richness (S)</p>
            <p className="mt-1 font-mono text-[#16A6A1]">S = count(unique classified taxa)</p>
            <p className="mt-1">Evaluated dynamically at Species, Genus, Family, Order, or Phylum resolution.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-[#123B2A] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          3. Scientific Limitations of eDNA Data
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Environmental DNA detections establish the presence of target nucleic acid fragments in a collected sample, not direct proof of live organism density or biomass. Primer amplification bias, hydrological transport, persistence time, and reference database gaps should always be considered when interpreting biodiversity metrics.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-display text-base font-semibold text-[#123B2A] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#21865B]" />
          4. Firebase &amp; PostgreSQL / Supabase Architecture
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          User identity is verified via Firebase Authentication ID tokens on every API call. Scientific tables (projects, samples, datasets, analyses, taxonomic_results, biodiversity_metrics, reports) are stored in PostgreSQL with owner-isolated access control. Complete SQL migration scripts for Supabase deployment are included in <code className="bg-slate-100 px-1 py-0.5 rounded">supabase/migrations/001_ecotrace_schema.sql</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">SETUP_GUIDE.md</code>.
        </p>
      </div>
    </div>
  );
};
