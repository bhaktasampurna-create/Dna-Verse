-- EcoTrace — Supabase PostgreSQL Schema & Row Level Security Migration
-- Run in Supabase SQL Editor or via `supabase db push`

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (mapped to Firebase Auth UID)
CREATE TABLE IF NOT EXISTS public.profiles (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Researcher',
  institution TEXT NOT NULL DEFAULT '',
  research_interest TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  research_objective TEXT NOT NULL DEFAULT '',
  environment_type TEXT NOT NULL DEFAULT 'Freshwater' CHECK (
    environment_type IN ('Freshwater', 'Marine', 'Soil', 'Forest', 'Wetland', 'Air', 'Other')
  ),
  location TEXT NOT NULL DEFAULT '',
  sampling_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Samples
CREATE TABLE IF NOT EXISTS public.samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  sample_name TEXT NOT NULL,
  sample_code TEXT NOT NULL,
  collection_date TEXT NOT NULL DEFAULT '',
  environment TEXT NOT NULL DEFAULT 'Freshwater',
  location TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Datasets
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  row_count INTEGER NOT NULL DEFAULT 0,
  sequence_count INTEGER NOT NULL DEFAULT 0,
  preview_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  upload_status TEXT NOT NULL DEFAULT 'validated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Analyses
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
  pipeline_name TEXT NOT NULL,
  pipeline_version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'completed',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

-- 6. Taxonomic Results
CREATE TABLE IF NOT EXISTS public.taxonomic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  taxon_name TEXT NOT NULL,
  taxon_rank TEXT NOT NULL DEFAULT 'Species',
  kingdom TEXT NOT NULL DEFAULT 'Unassigned',
  phylum TEXT NOT NULL DEFAULT 'Unassigned',
  class_name TEXT NOT NULL DEFAULT 'Unassigned',
  order_name TEXT NOT NULL DEFAULT 'Unassigned',
  family TEXT NOT NULL DEFAULT 'Unassigned',
  genus TEXT NOT NULL DEFAULT 'Unassigned',
  species TEXT NOT NULL DEFAULT 'Unassigned',
  read_count INTEGER NOT NULL DEFAULT 0,
  relative_abundance DOUBLE PRECISION NOT NULL DEFAULT 0,
  confidence_score DOUBLE PRECISION,
  reference_database TEXT NOT NULL DEFAULT 'User-Provided Taxonomic Table',
  identification_status TEXT NOT NULL DEFAULT 'Parsed from Dataset',
  sequence_identifier TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 7. Biodiversity Metrics
CREATE TABLE IF NOT EXISTS public.biodiversity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  taxon_level TEXT NOT NULL DEFAULT 'Species',
  species_richness INTEGER NOT NULL DEFAULT 0,
  shannon_index DOUBLE PRECISION NOT NULL DEFAULT 0,
  simpson_dominance DOUBLE PRECISION NOT NULL DEFAULT 0,
  simpson_index DOUBLE PRECISION NOT NULL DEFAULT 0,
  simpson_inverse DOUBLE PRECISION NOT NULL DEFAULT 0,
  simpson_convention TEXT NOT NULL DEFAULT '1 - D (Gini-Simpson)',
  pielou_evenness DOUBLE PRECISION,
  total_reads INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  report_name TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  report_type TEXT NOT NULL DEFAULT 'Biodiversity Assessment',
  summary_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Audit Logs (Admin only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_uid);
CREATE INDEX IF NOT EXISTS idx_samples_project ON public.samples(project_id);
CREATE INDEX IF NOT EXISTS idx_datasets_project ON public.datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset ON public.analyses(dataset_id);
CREATE INDEX IF NOT EXISTS idx_taxonomic_analysis ON public.taxonomic_results(analysis_id);
CREATE INDEX IF NOT EXISTS idx_biodiversity_analysis ON public.biodiversity_metrics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_reports_project ON public.reports(project_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biodiversity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Firebase UID passed via JWT sub claim in Supabase custom JWT integration)
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING ((auth.jwt() ->> 'sub') = uid);

CREATE POLICY "Users update own profile non-role" ON public.profiles
  FOR UPDATE USING ((auth.jwt() ->> 'sub') = uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = uid AND role = 'user');

CREATE POLICY "Owner full access projects" ON public.projects
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access samples" ON public.samples
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access datasets" ON public.datasets
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access analyses" ON public.analyses
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access taxonomy" ON public.taxonomic_results
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access biodiversity" ON public.biodiversity_metrics
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

CREATE POLICY "Owner full access reports" ON public.reports
  FOR ALL USING ((auth.jwt() ->> 'sub') = owner_uid)
  WITH CHECK ((auth.jwt() ->> 'sub') = owner_uid);

-- Private Supabase Storage Bucket for eDNA Datasets & Reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('ecotrace-datasets', 'ecotrace-datasets', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own eDNA objects" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ecotrace-datasets' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'))
  WITH CHECK (bucket_id = 'ecotrace-datasets' AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub'));
