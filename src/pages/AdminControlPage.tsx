import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Database,
  Loader2,
  Megaphone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { EcoTraceLogo } from '../components/EcoTraceLogo.tsx';

export const AdminControlPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { appUser, apiFetch, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users' | 'datasets' | 'platform' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [refDbs, setRefDbs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // New announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const ov = await apiFetch<{ stats: any; auditLogs: any[] }>('/api/admin/overview');
      setStats(ov.stats);
      setAuditLogs(ov.auditLogs || []);
      setDenied(null);

      const [uRes, dRes, rRes, aRes] = await Promise.all([
        apiFetch<{ users: any[] }>('/api/admin/users'),
        apiFetch<{ datasets: any[] }>('/api/admin/datasets'),
        fetch('/api/reference-databases').then((r) => r.json()),
        apiFetch<{ announcements: any[] }>('/api/admin/announcements'),
      ]);
      setUsers(uRes.users);
      setDatasets(dRes.datasets);
      setRefDbs(rRes.databases || []);
      setAnnouncements(aRes.announcements);
    } catch (err: any) {
      setDenied(err.message || 'Administrator authorization required.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!authLoading) {
      if (!appUser) {
        setDenied('Sign in with an authorized administrator account to access this console.');
        setLoading(false);
      } else {
        loadAdminData();
      }
    }
  }, [authLoading, appUser, loadAdminData]);

  const handleToggleUserStatus = async (uid: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    await apiFetch(`/api/admin/users/${uid}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadAdminData();
  };

  const handleDeleteDataset = async (id: string) => {
    await apiFetch(`/api/admin/datasets/${id}`, { method: 'DELETE' });
    await loadAdminData();
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    await apiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: annTitle, body: annBody, severity: 'info' }),
    });
    setAnnTitle('');
    setAnnBody('');
    await loadAdminData();
  };

  const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
    await apiFetch(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !isActive }),
    });
    await loadAdminData();
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (
        q &&
        !u.email.toLowerCase().includes(q) &&
        !u.fullName.toLowerCase().includes(q) &&
        !u.institution.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [users, userSearch, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#123B2A]" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-7 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="font-display text-xl font-bold text-slate-900">
            Restricted Control Console
          </h1>
          <p className="text-sm text-slate-600">{denied}</p>
          <p className="text-xs text-slate-500">
            Administrator access is enforced server-side via Firebase custom claims or <code className="bg-slate-100 px-1 rounded">ADMIN_EMAILS</code>.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to EcoTrace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FAF8]">
      <header className="bg-[#123B2A] text-white border-b border-emerald-900 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EcoTraceLogo variant="light" size={28} />
          <span className="text-xs font-mono text-emerald-200">
            Secure Administrator Console
          </span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Workspace
        </button>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: `Users (${users.length})` },
            { id: 'datasets', label: `Datasets (${datasets.length})` },
            { id: 'platform', label: 'Reference DBs & Announcements' },
            { id: 'audit', label: 'Audit Logs' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                tab === item.id ? 'bg-[#123B2A] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Users', val: stats.totalUsers, icon: Users },
              { label: 'Active Accounts', val: stats.activeUsers, icon: ShieldCheck },
              { label: 'Total Projects', val: stats.totalProjects, icon: Database },
              { label: 'Uploaded Datasets', val: stats.totalDatasets, icon: Database },
              { label: 'Total Analyses', val: stats.totalAnalyses, icon: Database },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{c.label}</span>
                    <Icon className="w-4 h-4 text-[#21865B]" />
                  </div>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#123B2A] tabular-nums">
                    {c.val}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email, or institution..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-3 font-medium">User</th>
                    <th className="py-2.5 pr-3 font-medium">Institution</th>
                    <th className="py-2.5 pr-3 font-medium">Role</th>
                    <th className="py-2.5 pr-3 font-medium">Status</th>
                    <th className="py-2.5 pr-3 font-medium">Last Login</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-900">{u.fullName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{u.institution || '—'}</td>
                      <td className="py-2.5 pr-3 font-mono">{u.role}</td>
                      <td className="py-2.5 pr-3 font-mono">
                        {u.status === 'active' ? '● active' : '✖ disabled'}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-slate-500 tabular-nums">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {u.uid !== appUser?.uid && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.uid, u.status)}
                            className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                              u.status === 'active'
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'datasets' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-medium">Dataset</th>
                  <th className="py-2.5 pr-3 font-medium">Owner</th>
                  <th className="py-2.5 pr-3 font-medium">Format</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Records</th>
                  <th className="py-2.5 font-medium text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{d.fileName}</p>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-slate-600">{d.ownerEmail || d.ownerUid}</td>
                    <td className="py-2.5 pr-3 font-mono">{d.fileFormat}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{d.rowCount}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteDataset(d.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'platform' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold text-[#123B2A]">
                Configured Reference Databases
              </h2>
              <div className="space-y-2.5 text-xs">
                {refDbs.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-[#F7FAF8] border border-slate-200">
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    <p className="font-mono text-[11px] text-[#16A6A1] mt-0.5">
                      {r.markerGene} · v{r.version} · {r.status}
                    </p>
                    <p className="text-slate-600 mt-1">{r.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h2 className="font-display text-sm font-semibold text-[#123B2A] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#21865B]" />
                Platform Announcements
              </h2>
              <form onSubmit={handlePublishAnnouncement} className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
                <textarea
                  rows={2}
                  required
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Maintenance window or pipeline update..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg cursor-pointer"
                >
                  Publish Announcement
                </button>
              </form>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{a.title}</p>
                      <p className="text-slate-600 mt-0.5">{a.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAnnouncement(a.id, a.isActive)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-[11px] cursor-pointer shrink-0"
                    >
                      {a.isActive ? 'Active (Hide)' : 'Hidden (Show)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-x-auto">
            <h2 className="font-display text-sm font-semibold text-[#123B2A] mb-3">
              Immutable Administrator Audit Trail
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Timestamp</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-3 text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-slate-800">{log.actorEmail}</td>
                    <td className="py-2 pr-3 text-[#123B2A]">{log.action}</td>
                    <td className="py-2 text-slate-600 truncate max-w-md">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
