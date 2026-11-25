import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  FolderPlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  TestTube2,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

const ENVIRONMENTS = ['Freshwater', 'Marine', 'Soil', 'Forest', 'Wetland', 'Air', 'Other'] as const;

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  researchObjective: string;
  environmentType: string;
  location: string;
  samplingDate: string;
  status: string;
  sampleCount: number;
  datasetCount: number;
  analysisCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SampleItem {
  id: string;
  projectId: string;
  sampleName: string;
  sampleCode: string;
  collectionDate: string;
  environment: string;
  location: string;
  createdAt: string;
}

export const ProjectsPage: React.FC<{ onGoUpload: (projectId: string) => void }> = ({
  onGoUpload,
}) => {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'samples'>('updated');

  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

  // Project form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [researchObjective, setResearchObjective] = useState('');
  const [environmentType, setEnvironmentType] = useState<string>('Freshwater');
  const [location, setLocation] = useState('');
  const [samplingDate, setSamplingDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Sample form
  const [sampleName, setSampleName] = useState('');
  const [sampleCode, setSampleCode] = useState('');
  const [sampleDate, setSampleDate] = useState('');
  const [sampleLocation, setSampleLocation] = useState('');
  const [addingSample, setAddingSample] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, sampRes] = await Promise.all([
        apiFetch<{ projects: ProjectItem[] }>('/api/projects'),
        apiFetch<{ samples: SampleItem[] }>('/api/samples'),
      ]);
      setProjects(projRes.projects);
      setSamples(sampRes.samples);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setResearchObjective('');
    setEnvironmentType('Freshwater');
    setLocation('');
    setSamplingDate('');
    setShowProjectModal(true);
  };

  const openEditModal = (proj: ProjectItem) => {
    setEditingProject(proj);
    setName(proj.name);
    setDescription(proj.description);
    setResearchObjective(proj.researchObjective);
    setEnvironmentType(proj.environmentType);
    setLocation(proj.location);
    setSamplingDate(proj.samplingDate);
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingProject) {
        await apiFetch(`/api/projects/${editingProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            description,
            researchObjective,
            environmentType,
            location,
            samplingDate,
          }),
        });
      } else {
        await apiFetch('/api/projects', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            researchObjective,
            environmentType,
            location,
            samplingDate,
          }),
        });
      }
      setShowProjectModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (proj: ProjectItem) => {
    try {
      await apiFetch(`/api/projects/${proj.id}`, { method: 'DELETE' });
      if (selectedProject?.id === proj.id) setSelectedProject(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !sampleName.trim() || !sampleCode.trim()) return;
    setAddingSample(true);
    try {
      await apiFetch('/api/samples', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProject.id,
          sampleName,
          sampleCode,
          collectionDate: sampleDate,
          environment: selectedProject.environmentType,
          location: sampleLocation || selectedProject.location,
        }),
      });
      setSampleName('');
      setSampleCode('');
      setSampleDate('');
      setSampleLocation('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add sample.');
    } finally {
      setAddingSample(false);
    }
  };

  const handleDeleteSample = async (id: string) => {
    try {
      await apiFetch(`/api/samples/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove sample.');
    }
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (envFilter !== 'All' && p.environmentType !== envFilter) return false;
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !p.location.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'samples') return b.sampleCount - a.sampleCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, search, envFilter, sortBy]);

  const projectSamples = useMemo(
    () => (selectedProject ? samples.filter((s) => s.projectId === selectedProject.id) : []),
    [samples, selectedProject]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            My Research Projects
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organize private eDNA biodiversity studies, sampling sites, and field sample metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name or location..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            aria-label="Filter by environment"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="All">All Environments</option>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort projects"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700"
          >
            <option value="updated">Sort: Recently Updated</option>
            <option value="name">Sort: Project Name</option>
            <option value="samples">Sort: Sample Count</option>
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className={selectedProject ? 'lg:col-span-7 space-y-3' : 'lg:col-span-12 grid md:grid-cols-2 xl:grid-cols-3 gap-4'}>
          {loading ? (
            <div className="col-span-full py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#21865B]" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full p-10 rounded-xl bg-white border border-slate-200 text-center">
              <p className="text-sm text-slate-600">No projects match your current filters.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] rounded-lg hover:bg-[#21865B] cursor-pointer"
              >
                Create Project
              </button>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const active = selectedProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className={`p-5 rounded-xl bg-white border transition-colors cursor-pointer ${
                    active ? 'border-[#123B2A] ring-1 ring-[#123B2A]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[#21865B] font-medium">
                        {proj.environmentType} · {proj.status}
                      </p>
                      <h3 className="mt-1 font-display text-base font-semibold text-[#123B2A] truncate">
                        {proj.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(proj)}
                        aria-label={`Edit ${proj.name}`}
                        className="p-1.5 rounded text-slate-400 hover:text-[#123B2A] hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj)}
                        aria-label={`Delete ${proj.name}`}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {proj.description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">{proj.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {proj.location || 'Unspecified location'}
                    </span>
                    <span className="font-mono tabular-nums shrink-0 ml-2">
                      {proj.sampleCount} samples · {proj.datasetCount} datasets
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Project Detail & Samples Panel */}
        {selectedProject && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-5 h-fit">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-[#16A6A1]">
                  {selectedProject.environmentType} · {selectedProject.samplingDate || 'Date not set'}
                </p>
                <h2 className="font-display text-lg font-bold text-[#123B2A]">
                  {selectedProject.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="Close project detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedProject.researchObjective && (
              <div>
                <p className="text-xs font-semibold text-slate-700">Research Objective</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {selectedProject.researchObjective}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#123B2A] inline-flex items-center gap-1.5">
                <TestTube2 className="w-4 h-4 text-[#21865B]" />
                Field Samples ({projectSamples.length})
              </h3>
              <button
                type="button"
                onClick={() => onGoUpload(selectedProject.id)}
                className="text-xs font-semibold text-[#21865B] hover:underline cursor-pointer"
              >
                Upload Dataset →
              </button>
            </div>

            <form onSubmit={handleAddSample} className="p-3.5 rounded-lg bg-[#F7FAF8] border border-slate-200 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Add Sample to Project</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="Sample name"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  required
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                  placeholder="Sample ID (e.g. RIV-01)"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-mono"
                />
                <input
                  type="date"
                  value={sampleDate}
                  onChange={(e) => setSampleDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                />
                <input
                  type="text"
                  value={sampleLocation}
                  onChange={(e) => setSampleLocation(e.target.value)}
                  placeholder="Site coordinates"
                  className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={addingSample}
                className="w-full py-1.5 text-xs font-semibold text-white bg-[#21865B] hover:bg-[#123B2A] rounded inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {addingSample ? 'Adding...' : 'Add Sample'}
              </button>
            </form>

            {projectSamples.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                No field samples recorded in this project yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projectSamples.map((samp) => (
                  <div
                    key={samp.id}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{samp.sampleName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {samp.sampleCode} · {samp.collectionDate || 'No date'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSample(samp.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label={`Delete sample ${samp.sampleName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-[#123B2A]">
                {editingProject ? 'Edit Research Project' : 'Create eDNA Project'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Columbia River Salmonid eDNA Monitoring"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Environment Type</label>
                  <select
                    value={environmentType}
                    onChange={(e) => setEnvironmentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {ENVIRONMENTS.map((env) => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Sampling Date</label>
                  <input
                    type="date"
                    value={samplingDate}
                    onChange={(e) => setSamplingDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sampling Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="45.643° N, 121.930° W · Oregon"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Research Objective</label>
                <input
                  type="text"
                  value={researchObjective}
                  onChange={(e) => setResearchObjective(e.target.value)}
                  placeholder="Assess seasonal vertebrate & macroinvertebrate diversity"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sampling protocol, filtration volume, and target marker genes..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg cursor-pointer"
                >
                  {saving ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
