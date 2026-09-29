import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';
import { Avatar, EmptyState, Spinner } from '../../components/ui';

interface Stats {
  totalCandidates: number; activeJobs: number; applications: number;
  shortlisted: number; rejected: number; interviews: number;
  avgAts: number | null; avgInterview: number | null;
}
interface SkillCount { skill: string; count: number }
interface Candidate { id: string; name: string; email: string; ats: number | null }

export default function HRDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topSkills, setTopSkills] = useState<SkillCount[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/hr/dashboard'), api.get('/hr/candidates')]).then(([d, c]) => {
      setStats(d.data.stats);
      setTopSkills(d.data.topSkills);
      setCandidates(c.data.candidates);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const cards = [
    { label: 'Total Candidates', val: stats.totalCandidates },
    { label: 'Active Jobs', val: stats.activeJobs },
    { label: 'Applications', val: stats.applications },
    { label: 'Shortlisted', val: stats.shortlisted },
    { label: 'Interviews', val: stats.interviews },
    { label: 'Avg ATS', val: stats.avgAts !== null ? `${Math.round(stats.avgAts)}%` : '—' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="font-display text-[26px] font-bold mb-1">Recruitment overview</h1>
      <p className="text-ink-500 text-[14px] mb-7">Live figures from your real candidate pipeline.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {cards.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-[12px] text-ink-500 font-medium">{s.label}</p>
            <p className="font-display font-bold text-[24px] mono mt-1">{s.val}</p>
          </div>
        ))}
      </div>

      {stats.totalCandidates === 0 ? (
        <EmptyState
          title="No candidates have applied yet"
          subtitle="Post a job and invite candidates to register to see live analytics here."
          action={<Link to="/hr/jobs" className="btn btn-primary">Post a job</Link>}
        />
      ) : (
        <>
          {topSkills.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-display font-semibold text-[16px] mb-4">Top candidate skills</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSkills} layout="vertical">
                  <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 12 }} width={100} />
                  <Bar dataKey="count" fill="#4F46E5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-[16px]">Recent candidates</h3>
              <Link to="/hr/candidates" className="text-indigo-600 text-[13px] font-semibold hover:underline">View all</Link>
            </div>
            {candidates.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={36} />
                  <div><p className="font-medium text-[13.5px]">{c.name}</p><p className="text-[12px] text-ink-500">{c.email}</p></div>
                </div>
                <Link to={`/hr/candidates/${c.id}`} className="btn btn-ghost !px-2 !py-1 text-[12.5px]">View</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
