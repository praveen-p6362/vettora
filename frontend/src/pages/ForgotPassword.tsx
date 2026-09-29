import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AuthShell } from './Login';

type Step = 'email' | 'reset';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function onRequestCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setInfo(res.data.message);
      setStep('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'reset') {
    return (
      <AuthShell title="Reset your password">
        {info && <div className="mb-4 text-[13px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">{info}</div>}
        {error && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={onReset}>
          <label className="text-[13px] font-semibold block mb-1.5">Verification code</label>
          <input className="input mb-3 text-center tracking-[0.4em] font-mono" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
          <label className="text-[13px] font-semibold block mb-1.5">New password</label>
          <input className="input mb-5" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">{busy ? 'Updating…' : 'Update password'}</button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password">
      {error && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
      <form onSubmit={onRequestCode}>
        <label className="text-[13px] font-semibold block mb-1.5">Email address</label>
        <input className="input mb-5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send verification code'}</button>
      </form>
    </AuthShell>
  );
}
