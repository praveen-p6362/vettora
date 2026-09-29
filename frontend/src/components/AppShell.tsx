import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

const candidateLinks = [
  { to: '/', label: 'Dashboard', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
  { to: '/resume', label: 'Resume & ATS', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { to: '/jobs', label: 'Jobs', icon: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { to: '/interview', label: 'Interview', icon: 'M3 5h12v14H3zM15 9l6-3v12l-6-3' },
  { to: '/reports', label: 'Reports', icon: 'M9 17v-6M13 17V9M17 17v-3M3 3h18v18H3z' },
];
const hrLinks = [
  { to: '/', label: 'Overview', icon: 'M3 3v18h18M7 15l4-6 4 3 5-8' },
  { to: '/hr/jobs', label: 'Jobs', icon: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { to: '/hr/candidates', label: 'Candidates', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const links = user.role === 'hr' ? hrLinks : candidateLinks;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-white border-r border-ink-100 flex flex-col h-screen sticky top-0 hidden lg:flex">
        <div className="px-6 py-6 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-pop">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" /></svg>
          </div>
          <div>
            <div className="font-display font-bold text-[17px] leading-none">Aptura</div>
            <div className="text-[11px] text-ink-500 mt-0.5">AI Recruitment</div>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-2 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `navlink flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium ${isActive ? 'active' : ''}`}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d={l.icon} /></svg>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-ink-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate">{user.name}</div>
              <div className="text-[12px] text-ink-500 truncate">{user.role === 'hr' ? 'HR / Recruiter' : 'Candidate'}</div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              title="Log out"
              className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center shrink-0"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-100 px-6 py-3.5 flex items-center gap-4">
          <div className="text-[14px] font-semibold text-ink-700">{user.role === 'hr' ? 'HR Portal' : 'Candidate Portal'}</div>
          <div className="flex-1" />
          <span className="badge bg-indigo-100 text-indigo-600">{user.role === 'hr' ? 'HR' : 'Candidate'}</span>
        </header>
        <main className="p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
