import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from './Login';

type Step = 'form' | 'otp';

export default function Register() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');
  const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== password2) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      await register(name, email, password, role);
      setInfo(`We sent a 6-digit verification code to ${email}. Check your inbox (and spam folder).`);
      setStep('otp');
      startCooldown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyOtp(email, code);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startCooldown() {
    setCooldown(60);
    const iv = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
  }

  async function onResend() {
    setError('');
    try {
      await resendOtp(email, 'register');
      setInfo(`A new code was sent to ${email}.`);
      startCooldown();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (step === 'otp') {
    return (
      <AuthShell title="Verify your email">
        {info && <div className="mb-4 text-[13px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">{info}</div>}
        {error && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={onSubmitOtp}>
          <label className="text-[13px] font-semibold block mb-1.5">Enter the 6-digit code</label>
          <input
            className="input mb-4 text-center tracking-[0.5em] font-mono text-[18px]"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
          <button className="btn btn-primary w-full justify-center mb-3" disabled={busy} type="submit">{busy ? 'Verifying…' : 'Verify & create account'}</button>
        </form>
        <button
          className="btn btn-secondary w-full justify-center"
          disabled={cooldown > 0}
          onClick={onResend}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <button className="text-[12.5px] text-ink-500 mt-4 block mx-auto hover:underline" onClick={() => setStep('form')}>Back</button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account">
      {error && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
      <form onSubmit={onSubmitForm}>
        <label className="text-[13px] font-semibold block mb-1.5">I am a</label>
        <div className="bg-ink-100 rounded-xl p-1 flex text-[13px] font-semibold mb-4">
          <button type="button" onClick={() => setRole('candidate')} className="flex-1 py-1.5 rounded-lg" style={role === 'candidate' ? { background: '#fff', color: '#3730A3', boxShadow: '0 1px 2px rgba(15,23,42,.08)' } : {}}>Candidate</button>
          <button type="button" onClick={() => setRole('hr')} className="flex-1 py-1.5 rounded-lg" style={role === 'hr' ? { background: '#fff', color: '#3730A3', boxShadow: '0 1px 2px rgba(15,23,42,.08)' } : {}}>HR / Recruiter</button>
        </div>
        <label className="text-[13px] font-semibold block mb-1.5">Full name</label>
        <input className="input mb-3" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        <label className="text-[13px] font-semibold block mb-1.5">Gmail address</label>
        <input className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
        <label className="text-[13px] font-semibold block mb-1.5">Password</label>
        <input className="input mb-3" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <label className="text-[13px] font-semibold block mb-1.5">Confirm password</label>
        <input className="input mb-5" type="password" required minLength={8} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Repeat password" />
        <button className="btn btn-primary w-full justify-center" disabled={busy} type="submit">{busy ? 'Sending code…' : 'Continue'}</button>
      </form>
      <p className="text-center text-[13px] mt-4">
        Already have an account? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
