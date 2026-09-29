import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in">
      {error && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
      <form onSubmit={onSubmit}>
        <label className="text-[13px] font-semibold block mb-1.5">Email address</label>
        <input className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        <label className="text-[13px] font-semibold block mb-1.5">Password</label>
        <input className="input mb-5" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="flex justify-between mt-4 text-[13px]">
        <Link to="/forgot-password" className="text-indigo-600 font-semibold hover:underline">Forgot password?</Link>
        <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Create account</Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-pop">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" /></svg>
          </div>
          <span className="font-display font-bold text-[20px]">Aptura AI</span>
        </div>
        <div className="card p-7">
          <h1 className="font-display font-bold text-[18px] mb-5">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
