import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { DEMO_SAMPLES } from '../data/demoDatasets.ts';
import { ProjectItem } from './ProjectsPage.tsx';

interface TaxonRow {
  id?: string;
  projectId?: string;
  sampleId?: string | null;
  taxonName: string;
  taxonRank: string;
  kingdom: string;
  phylum: string;
  className: string;
  orderName: string;
  family: string;
  genus: string;
  species: string;
  readCount: number;
  confidenceScore: number | null;
  referenceDatabase: string;
}

interface TreeNode {
  name: string;
  rank: string;
  reads: number;
  taxaCount: number;
  children: Map<string, TreeNode>;
}

export const TaxonomicExplorerPage: React.FC = () => {
  const { apiFetch } = useAuth();
  const [realTaxa, setRealTaxa] = useState<TaxonRow[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sourceMode, setSourceMode] = useState<'workspace' | 'demo'>('workspace');
  const [projectFilter, setProjectFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      apiFetch<{ taxa: TaxonRow[] }>('/api/taxonomy'),
      apiFetch<{ projects: ProjectItem[] }>('/api/projects'),
    ])
      .then(([tRes, pRes]) => {
        setRealTaxa(tRes.taxa);
        setProjects(pRes.projects);
        if (tRes.taxa.length === 0) {
          setSourceMode('demo');
        }
      })
      .catch(() => setSourceMode('demo'));
  }, [apiFetch]);

  const activeTaxa: TaxonRow[] = useMemo(() => {
    if (sourceMode === 'demo') {
      return DEMO_SAMPLES.flatMap((s) =>
        s.taxa.map((t) => ({
          ...t,
          projectId: s.projectId,
          sampleId: s.id,
        }))
      );
    }
    return realTaxa.filter((t) => projectFilter === 'All' || t.projectId === projectFilter);
  }, [sourceMode, realTaxa, projectFilter]);

  const filteredTaxa = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeTaxa;
    return activeTaxa.filter((t) =>
      [t.kingdom, t.phylum, t.className, t.orderName, t.family, t.genus, t.species, t.taxonName]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [activeTaxa, search]);

  const tree = useMemo(() => {
    const root = new Map<string, TreeNode>();
    for (const row of filteredTaxa) {
      const levels: Array<[string, string]> = [
        ['Kingdom', row.kingdom || 'Unassigned'],
        ['Phylum', row.phylum || 'Unassigned'],
        ['Class', row.className || 'Unassigned'],
        ['Order', row.orderName || 'Unassigned'],
        ['Family', row.family || 'Unassigned'],
        ['Genus', row.genus || 'Unassigned'],
        ['Species', row.species !== 'Unassigned' ? row.species : row.taxonName],
      ];

      let currentMap = root;
      for (const [rank, name] of levels) {
        if (!currentMap.has(name)) {
          currentMap.set(name, {
            name,
            rank,
            reads: 0,
            taxaCount: 0,
            children: new Map(),
          });
        }
        const node = currentMap.get(name)!;
        node.reads += row.readCount;
        node.taxaCount += 1;
        currentMap = node.children;
      }
    }
    return root;
  }, [filteredTaxa]);

  const toggleNode = (pathKey: string) => {
    setExpanded((prev) => ({ ...prev, [pathKey]: !(prev[pathKey] ?? true) }));
  };

  const renderNodes = (map: Map<string, TreeNode>, depth = 0, parentKey = ''): React.ReactNode => {
    const sorted = Array.from(map.values()).sort((a, b) => b.reads - a.reads);
    return sorted.map((node) => {
      const key = `${parentKey}/${node.rank}:${node.name}`;
      const hasChildren = node.children.size > 0;
      const isOpen = expanded[key] ?? depth < 2;

      return (
        <div key={key}>
          <div
            onClick={() => hasChildren && toggleNode(key)}
            style={{ paddingLeft: `${depth * 20 + 12}px` }}
            className={`py-2 pr-4 flex items-center justify-between text-xs border-b border-slate-100 ${
              hasChildren ? 'cursor-pointer hover:bg-slate-50' : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {hasChildren ? (
                isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )
              ) : (
                <span className="w-3.5 inline-block shrink-0" />
              )}
              <span className="font-mono text-[11px] text-[#16A6A1] w-16 shrink-0">
                {node.rank}
              </span>
              <span
                className={`truncate ${
                  node.rank === 'Species' || node.rank === 'Genus'
                    ? 'italic font-medium text-[#123B2A]'
                    : 'font-medium text-slate-800'
                }`}
              >
                {node.name}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono tabular-nums text-slate-600 shrink-0">
              <span>{node.taxaCount} entries</span>
              <span className="w-24 text-right">{node.reads.toLocaleString()} reads</span>
            </div>
          </div>
          {hasChildren && isOpen && renderNodes(node.children, depth + 1, key)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            Taxonomic Explorer
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Navigate Kingdom → Phylum → Class → Order → Family → Genus → Species hierarchies.
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
            My Taxa ({realTaxa.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('demo')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              sourceMode === 'demo' ? 'bg-white text-[#123B2A] shadow-sm' : 'text-slate-600'
            }`}
          >
            Demo Taxonomy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter any taxonomic rank or scientific name..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300"
          />
        </div>
        {sourceMode === 'workspace' && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
          >
            <option value="All">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {tree.size === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No taxonomic records found. Run an analysis or switch to Demo Taxonomy.
          </div>
        ) : (
          <div>{renderNodes(tree)}</div>
        )}
      </div>
    </div>
  );
};
