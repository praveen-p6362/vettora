import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div className="avatar-initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

export function ScoreRing({ value, size = 140, label, sub }: { value: number | null; size?: number; label?: string; sub?: string }) {
  return (
    <div className="scorering" style={{ width: size, height: size, ['--p' as any]: value ?? 0, ['--c' as any]: '#4338CA' }}>
      <div className="scorering-val text-center">
        <div className="font-display font-bold mono" style={{ fontSize: size * 0.24 }}>{value ?? '—'}</div>
        <div className="text-[11px] text-ink-500" style={{ marginTop: -4 }}>{sub || '/ 100'}</div>
      </div>
      {label && <div className="sr-only">{label}</div>}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="card empty-state">
      <p className="font-display font-semibold text-[16px]">{title}</p>
      {subtitle && <p className="text-ink-500 text-[13.5px] mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="spin" width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="#4338CA" strokeWidth="2">
      <path d="M12 2a10 10 0 1 0 10 10" />
    </svg>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Shortlisted: 'bg-good-100 text-good-600',
    Interviewing: 'bg-indigo-100 text-indigo-600',
    Applied: 'bg-ink-100 text-ink-700',
    New: 'bg-ink-100 text-ink-700',
    Rejected: 'bg-bad-100 text-bad-600',
  };
  return <span className={`badge ${map[status] || map.New}`}>{status}</span>;
}

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
