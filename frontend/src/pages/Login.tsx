import { useState, FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { setDataMode, DataMode } from '../state/dataMode';
import { User, Lock, ArrowRight, WifiOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      // Login successful - AuthContext will update state and App.tsx will show main app
      // Set data mode to ONLINE when authenticated (will be enforced by dataMode logic)
      setDataMode(DataMode.ONLINE, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineMode = () => {
    // Set offline mode and trigger a page reload to re-evaluate App.tsx
    setDataMode(DataMode.OFFLINE, false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] rounded-full bg-slate-800/50 blur-[80px]" />
      </div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl bg-white/5 p-8 sm:p-10">

          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-blue-600/20 mb-6 ring-1 ring-blue-500/30">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-lg opacity-40"></div>
                <svg className="w-10 h-10 text-blue-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">AccrediFy</h1>
            <p className="text-slate-400 text-lg">AI-Powered Accreditation Intelligence</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 hover:border-slate-600"
                  placeholder="Username"
                  autoComplete="username"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-lg px-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 hover:border-slate-600"
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-slate-500 bg-transparent backdrop-blur-xl">or continue with</span>
            </div>
          </div>

          {/* Offline Mode */}
          <button
            type="button"
            onClick={handleOfflineMode}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-slate-700 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white hover:border-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-700 focus:ring-offset-slate-900"
          >
            <WifiOff className="w-4 h-4 mr-2" />
            Offline Demo Mode
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-600">
          SECURE SYSTEM &bull; AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </div>
  );
}