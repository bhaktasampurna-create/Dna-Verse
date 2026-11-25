import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, LogOut, MailCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { requestPasswordReset, resendVerificationEmail } from '../lib/firebase.ts';

export const ProfileSettingsPage: React.FC = () => {
  const { appUser, firebaseUser, apiFetch, syncProfile, logout } = useAuth();
  const [fullName, setFullName] = useState(appUser?.fullName || '');
  const [institution, setInstitution] = useState(appUser?.institution || '');
  const [researchInterest, setResearchInterest] = useState(appUser?.researchInterest || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appUser) {
      setFullName(appUser.fullName);
      setInstitution(appUser.institution);
      setResearchInterest(appUser.researchInterest);
    }
  }, [appUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, institution, researchInterest }),
      });
      await syncProfile();
      setMessage('Profile settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!appUser?.email) return;
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(appUser.email);
      setMessage(`Password reset instructions dispatched to ${appUser.email}.`);
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset email.');
    }
  };

  const handleResendVerify = async () => {
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setMessage('Verification email sent. Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification email.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#123B2A]">
          Profile &amp; Account Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your researcher identity, institutional affiliation, and Firebase security credentials.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-[#123B2A]">
          Researcher Profile
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={appUser?.email || ''}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Institution / Organization</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="University or Conservation Agency"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Research Interest</label>
            <input
              type="text"
              value={researchInterest}
              onChange={(e) => setResearchInterest(e.target.value)}
              placeholder="Estuarine metabarcoding · 12S / COI"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Account Role: <span className="font-mono font-medium text-slate-700">{appUser?.role || 'user'}</span> (managed server-side)
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#123B2A] hover:bg-[#21865B] rounded-lg inline-flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Profile
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-[#123B2A] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#21865B]" />
          Security &amp; Verification
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">Email Verification Status</p>
            <p className="text-xs text-slate-500">
              {firebaseUser?.emailVerified
                ? 'Your email address is verified.'
                : 'Your email address has not been verified yet.'}
            </p>
          </div>
          {!firebaseUser?.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerify}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#123B2A] border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <MailCheck className="w-3.5 h-3.5" />
              Resend Verification
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">Password Management</p>
            <p className="text-xs text-slate-500">
              Send a Firebase password reset link to your registered email address.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#123B2A] border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Send Reset Email
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-slate-800">Sign Out</p>
            <p className="text-xs text-slate-500">End your current EcoTrace session on this device.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
