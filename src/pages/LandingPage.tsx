import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  GitCompare,
  Layers,
  Menu,
  Microscope,
  ShieldCheck,
  X,
} from 'lucide-react';
import { EcoTraceLogo } from '../components/EcoTraceLogo.tsx';

interface LandingPageProps {
  isAuthenticated: boolean;
  onNavigateAuth: (mode: 'login' | 'register') => void;
  onEnterWorkspace: (demo?: boolean) => void;
}

type InfoModalType =
  | null
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'documentation'
  | 'limitations';

const MODAL_CONTENT: Record<
  Exclude<InfoModalType, null>,
  { title: string; body: string[] }
> = {
  about: {
    title: 'About EcoTrace',
    body: [
      'EcoTrace is a scientific environmental DNA (eDNA) analysis platform built for aquatic, terrestrial, and microbial ecology teams.',
      'Researchers can organize field sampling projects, upload validated taxonomic abundance tables or raw sequence files, inspect multi-rank taxonomic hierarchies, calculate standardized diversity indices, and archive reproducible reports.',
    ],
  },
  contact: {
    title: 'Research & Technical Contact',
    body: [
      'For institutional onboarding, reference database connector requests (NCBI BLAST+, SILVA, BOLD Systems), or security inquiries, contact your workspace administrator or deploy EcoTrace with your laboratory Supabase and Firebase credentials.',
      'Full configuration instructions are documented in the built-in Help & Documentation module and SETUP_GUIDE.md.',
    ],
  },
  privacy: {
    title: 'Privacy Policy & Data Ownership',
    body: [
      'All research projects, field sample coordinates, uploaded eDNA datasets, and generated reports remain strictly private to the authenticated account owner.',
      'Authentication is handled through Firebase Authentication, and user records are isolated at both the API authorization layer and database Row Level Security policies.',
    ],
  },
  terms: {
    title: 'Terms of Use',
    body: [
      'EcoTrace provides computational tooling for biodiversity calculation and dataset management. Users are responsible for verifying sample metadata, chain-of-custody records, and reference taxonomy provenance before citing results in peer-reviewed publications.',
    ],
  },
  documentation: {
    title: 'Platform Documentation Summary',
    body: [
      'Supported formats: CSV, TSV, TXT, and JSON taxonomic abundance tables; FASTA and FASTQ raw nucleotide files (sequence QC metrics).',
      'Biodiversity equations: Shannon H\' = -sum(p_i * ln(p_i)), Simpson Dominance D = sum(p_i^2), Gini-Simpson Diversity = 1 - D, Inverse Simpson = 1 / D, and Pielou\'s Evenness J = H\' / ln(S) for S > 1.',
    ],
  },
  limitations: {
    title: 'Scientific Limitations of eDNA Analysis',
    body: [
      'Environmental DNA detection indicates the presence of genetic material in a sampled medium and does not independently guarantee live organism presence, biomass, or exact population abundance.',
      'Relative read counts can be influenced by PCR primer bias, shedding rates, DNA degradation, water transport, and reference database completeness. Raw FASTA/FASTQ uploads require an external taxonomic classifier (e.g., BLAST, DADA2, Kraken2) before species identification.',
    ],
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onNavigateAuth,
  onEnterWorkspace,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<InfoModalType>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-slate-900 flex flex-col">
      {/* Top Bar Contract: Brand — Nav Links — Primary Action */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a href="#top" className="shrink-0">
            <EcoTraceLogo size={32} />
          </a>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#top" className="hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0">
              Home
            </a>
            <a href="#about" className="hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0">
              About
            </a>
            <a href="#features" className="hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#scientific-approach" className="hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0">
              Scientific Approach
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                onClick={() => onEnterWorkspace(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigateAuth('login')}
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-[#123B2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigateAuth('register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
            <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              <a href="#top" onClick={() => setMobileMenuOpen(false)} className="py-1.5">Home</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-1.5">About</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-1.5">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1.5">How It Works</a>
              <a href="#scientific-approach" onClick={() => setMobileMenuOpen(false)} className="py-1.5">Scientific Approach</a>
            </div>
            <div className="pt-2 border-t border-slate-200 flex gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => onEnterWorkspace(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-[#123B2A] rounded-lg"
                >
                  Open Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onNavigateAuth('login')}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-800 border border-slate-300 rounded-lg"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => onNavigateAuth('register')}
                    className="flex-1 py-2.5 text-sm font-medium text-white bg-[#123B2A] rounded-lg"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="top" className="border-b border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-[#21865B] mb-3">
              EcoTrace · Explore Life Through Environmental DNA
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#123B2A] leading-[1.12] [text-wrap:balance]">
              Discover Biodiversity Through Environmental DNA.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Transform environmental DNA datasets into meaningful taxonomic insights and biodiversity assessments through an intuitive scientific analysis platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => (isAuthenticated ? onEnterWorkspace(false) : onNavigateAuth('register'))}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => (isAuthenticated ? onEnterWorkspace(true) : onNavigateAuth('login'))}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#123B2A] bg-[#F7FAF8] border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Explore Platform
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>Supported formats: CSV · TSV · JSON · FASTA · FASTQ</span>
              <span>Indices: Shannon H&apos; · Simpson 1-D · Pielou J</span>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-[#EAF4EF] min-h-[300px] lg:min-h-[420px]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_edna_ecosystem_1795609106258.jpg"
                  alt="Freshwater eDNA sampling bottles, fern leaf specimen, and molecular DNA double helix sculpture"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Microscope className="w-12 h-12 text-[#21865B] mb-3" />
                  <p className="font-display font-semibold text-[#123B2A]">
                    Environmental DNA Analysis Workspace
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About & Field Ecology Context */}
      <section id="about" className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A6A1]">
              Research Context
            </p>
            <h2 className="font-display text-3xl font-bold text-[#123B2A] [text-wrap:balance]">
              Built for empirical ecological monitoring and transparent biodiversity reporting.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Every water filtration sample, soil core, and marine transect carries trace genetic signatures of the surrounding community. EcoTrace structures field metadata, validates sequence and abundance files, and computes exact ecological indices without fabricating unverified species assignments.
            </p>
            <div className="pt-2 space-y-2 text-sm text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#21865B] mt-0.5 shrink-0" />
                <span>Private project-based organization by biome and sampling coordinates</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#21865B] mt-0.5 shrink-0" />
                <span>Clear distinction between validated taxonomic tables and raw FASTA/FASTQ QC</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#21865B] mt-0.5 shrink-0" />
                <span>Explicit demonstration datasets for exploration prior to uploading field data</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src="/src/assets/images/biome_freshwater_stream_1795609106648.jpg"
                  alt="Mountain forest stream sampled for freshwater eDNA"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5">
                <p className="text-sm font-semibold text-[#123B2A]">Freshwater &amp; Riparian</p>
                <p className="text-xs text-slate-500 mt-0.5">12S MiFish · COI benthic surveys</p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src="/src/assets/images/biome_marine_kelp_1795609105811.jpg"
                  alt="Marine kelp forest transect ecosystem"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5">
                <p className="text-sm font-semibold text-[#123B2A]">Marine &amp; Coastal</p>
                <p className="text-xs text-slate-500 mt-0.5">18S · 12S subtidal reef transects</p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src="/src/assets/images/lab_edna_filtration_1795609106761.jpg"
                  alt="Molecular laboratory eDNA filtration membranes and sample vials"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5">
                <p className="text-sm font-semibold text-[#123B2A]">Lab Filtration &amp; QC</p>
                <p className="text-xs text-slate-500 mt-0.5">0.22 µm Sterivex · FASTQ validation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16A6A1]">
              Platform Capabilities
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-[#123B2A]">
              Six integrated modules for eDNA biodiversity workflows
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                icon: Database,
                title: 'eDNA Dataset Management',
                desc: 'Upload CSV, TSV, JSON, TXT, FASTA, and FASTQ files with validated metadata, sample provenance, and private project isolation.',
              },
              {
                num: '02',
                icon: Layers,
                title: 'Taxonomic Identification',
                desc: 'Inspect Kingdom-through-Species classifications, sequence identifiers, reference database provenance, and confidence scores.',
              },
              {
                num: '03',
                icon: Microscope,
                title: 'Biodiversity Assessment',
                desc: 'Compute Species Richness, Shannon H\', Simpson indices (D, 1-D, 1/D), and Pielou\'s Evenness across taxonomic ranks.',
              },
              {
                num: '04',
                icon: GitCompare,
                title: 'Sample Comparison',
                desc: 'Compare multiple sampling locations side-by-side to identify shared taxa, site-unique detections, and diversity shifts.',
              },
              {
                num: '05',
                icon: BarChart3,
                title: 'Scientific Visualization',
                desc: 'Explore responsive taxonomic composition donuts, relative abundance profiles, and diversity comparison charts.',
              },
              {
                num: '06',
                icon: FileSpreadsheet,
                title: 'Research Report Generation',
                desc: 'Archive reproducible biodiversity assessments with calculation methodology, limitations, CSV exports, and print-ready formatting.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.num}
                  className="p-6 rounded-xl border border-slate-200 bg-[#F7FAF8] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-semibold text-[#21865B]">
                        {feat.num}
                      </span>
                      <Icon className="w-5 h-5 text-[#123B2A]" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#123B2A]">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16A6A1]">
            How It Works
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-[#123B2A]">
            From environmental sample to reproducible biodiversity report
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              step: 'Step 1',
              title: 'Upload your dataset',
              desc: 'Attach your eDNA CSV/TSV taxonomic table or FASTA/FASTQ sequence file to a project and field sample.',
            },
            {
              step: 'Step 2',
              title: 'Process and analyze your samples',
              desc: 'Validate structure, inspect read counts or sequence QC metrics, and execute the configured analysis pipeline.',
            },
            {
              step: 'Step 3',
              title: 'Explore taxonomic identification',
              desc: 'Navigate the interactive Kingdom-to-Species hierarchy, filter by rank, and search detected organisms.',
            },
            {
              step: 'Step 4',
              title: 'Assess biodiversity and generate reports',
              desc: 'Compare sites using Shannon, Simpson, and Pielou indices and export CSV or print-ready scientific reports.',
            },
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-xl border border-slate-200 bg-white">
              <p className="font-mono text-xs font-semibold text-[#16A6A1]">{item.step}</p>
              <h3 className="mt-2 font-display text-base font-semibold text-[#123B2A]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scientific Metrics */}
      <section id="scientific-approach" className="bg-[#123B2A] text-white py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4FD1C5]">
              Scientific Methodology
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold [text-wrap:balance]">
              Standardized ecological indices calculated from validated read data
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Species Richness (S)',
                formula: 'S = count(unique taxa with n_i > 0)',
                desc: 'Number of distinct taxa detected at the selected taxonomic rank (Species, Genus, Family, Order, or Phylum).',
              },
              {
                name: 'Shannon Diversity Index (H\')',
                formula: 'H\' = -∑ (p_i · ln p_i)',
                desc: 'Accounts for both richness and evenness using natural logarithms of taxon relative proportions p_i.',
              },
              {
                name: 'Simpson Diversity Index (1 - D)',
                formula: 'D = ∑ p_i²,  Gini-Simpson = 1 - D',
                desc: 'Measures the probability that two randomly drawn reads belong to different taxa; reported alongside D and 1/D without mixing conventions.',
              },
              {
                name: 'Pielou\'s Evenness (J)',
                formula: 'J = H\' / ln(S)  [for S > 1]',
                desc: 'Quantifies how evenly reads are distributed across detected taxa on a 0–1 scale, safely handling S ≤ 1 edge cases.',
              },
              {
                name: 'Taxonomic Composition',
                formula: 'Kingdom → Phylum → … → Species',
                desc: 'Aggregates detected lineages across seven standard taxonomic ranks for hierarchical exploration.',
              },
              {
                name: 'Relative Abundance (p_i)',
                formula: 'p_i = n_i / N',
                desc: 'Proportional read representation within each sample—interpreted carefully alongside PCR and shedding limitations.',
              },
            ].map((metric) => (
              <div
                key={metric.name}
                className="p-6 rounded-xl bg-white/5 border border-white/15"
              >
                <h3 className="font-display text-base font-semibold text-white">
                  {metric.name}
                </h3>
                <p className="mt-2 font-mono text-xs text-[#4FD1C5] tabular-nums">
                  {metric.formula}
                </p>
                <p className="mt-3 text-sm text-emerald-100/85 leading-relaxed">
                  {metric.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <EcoTraceLogo size={28} />
            <p className="mt-2 text-xs text-slate-500">
              EcoTrace — Identifying Taxonomy and Assessing Biodiversity from eDNA Datasets.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
            <button onClick={() => setActiveModal('about')} className="hover:text-[#123B2A] cursor-pointer">
              About EcoTrace
            </button>
            <button onClick={() => setActiveModal('contact')} className="hover:text-[#123B2A] cursor-pointer">
              Contact
            </button>
            <button onClick={() => setActiveModal('privacy')} className="hover:text-[#123B2A] cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => setActiveModal('terms')} className="hover:text-[#123B2A] cursor-pointer">
              Terms of Use
            </button>
            <button onClick={() => setActiveModal('documentation')} className="hover:text-[#123B2A] cursor-pointer">
              Documentation
            </button>
            <button onClick={() => setActiveModal('limitations')} className="hover:text-[#123B2A] cursor-pointer">
              Scientific Limitations
            </button>
          </div>
        </div>
      </footer>

      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-[#123B2A]">
                {activeModal === 'limitations' ? (
                  <BookOpen className="w-5 h-5 text-[#21865B]" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#21865B]" />
                )}
                <h3 className="font-display text-lg font-semibold">
                  {MODAL_CONTENT[activeModal].title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
              {MODAL_CONTENT[activeModal].body.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
