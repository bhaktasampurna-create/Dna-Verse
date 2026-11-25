import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldAlert } from 'lucide-react';
import { EcoTraceLogo } from '../components/EcoTraceLogo.tsx';
import {
  formatFirebaseAuthError,
  loginUserWithEmail,
  registerUserWithEmail,
  requestPasswordReset,
  signInWithGooglePopup,
} from '../lib/firebase.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

interface AuthPagesProps {
  initialMode: 'login' | 'register' | 'forgot';
  onBackHome: () => void;
  onSuccess: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialMode,
  onBackHome,
  onSuccess,
}) => {
  const { syncProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [researchInterest, setResearchInterest] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Enter a password', color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-[#21865B]' };
    return { score: 4, label: 'Very Strong', color: 'bg-[#123B2A]' };
  }, [password]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await signInWithGooglePopup(rememberMe);
      await syncProfile();
      onSuccess();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your registered email address.');
        return;
      }
      setSubmitting(true);
      try {
        await requestPasswordReset(email.trim());
        setSuccessMsg('Password reset instructions have been sent to your email address.');
      } catch (err) {
        setErrorMsg(formatFirebaseAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'register') {
      if (fullName.trim().length < 2) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!email.trim().includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (!acceptTerms) {
        setErrorMsg('Please accept the EcoTrace Terms of Use and Privacy Policy.');
        return;
      }

      setSubmitting(true);
      try {
        await registerUserWithEmail(fullName.trim(), email.trim(), password);
        await syncProfile({
          fullName: fullName.trim(),
          institution: institution.trim(),
          researchInterest: researchInterest.trim(),
        });
        setSuccessMsg(
          'Account created. A verification link has been sent to your email. Redirecting to your workspace...'
        );
        setTimeout(() => onSuccess(), 900);
      } catch (err) {
        setErrorMsg(formatFirebaseAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Login
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    setSubmitting(true);
    try {
      await loginUserWithEmail(email.trim(), password, rememberMe);
      await syncProfile();
      onSuccess();
    } catch (err) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#123B2A] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to EcoTrace
          </button>
          <EcoTraceLogo size={28} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-7 shadow-sm">
          <h1 className="font-display text-2xl font-bold text-[#123B2A]">
            {mode === 'login'
              ? 'Sign in to EcoTrace'
              : mode === 'register'
                ? 'Create Research Account'
                : 'Reset Password'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {mode === 'login'
              ? 'Access your eDNA projects, datasets, and biodiversity analyses.'
              : mode === 'register'
                ? 'Register with Firebase Authentication to manage private eDNA research.'
                : 'Enter your account email to receive a password reset link.'}
          </p>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="mt-5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>or use email</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Elena Vance"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@institute.org"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && password.length > 0 && (
                  <div className="mt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 rounded-full ${
                            passwordStrength.score >= lvl ? passwordStrength.color : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Password strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Institution (optional)
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Marine Ecology Lab"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Research Focus (optional)
                    </label>
                    <input
                      type="text"
                      value={researchInterest}
                      onChange={(e) => setResearchInterest(e.target.value)}
                      placeholder="Freshwater fish 12S"
                      className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#16A6A1]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#123B2A] focus:ring-[#16A6A1]"
                  />
                  <span>
                    I accept the EcoTrace Terms of Use and Privacy Policy. Accounts are assigned standard researcher access by default.
                  </span>
                </label>
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#123B2A] focus:ring-[#16A6A1]"
                  />
                  Remember session
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('forgot');
                  }}
                  className="font-medium text-[#21865B] hover:text-[#123B2A] cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#123B2A] hover:bg-[#21865B] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : mode === 'login' ? (
                'Sign In'
              ) : mode === 'register' ? (
                'Create Account'
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
            {mode === 'login' ? (
              <>
                New to EcoTrace?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('register');
                  }}
                  className="font-semibold text-[#123B2A] hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('login');
                  }}
                  className="font-semibold text-[#123B2A] hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
