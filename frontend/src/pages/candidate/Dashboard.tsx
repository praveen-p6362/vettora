import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Spinner } from '../../components/ui';

interface ResumeDoc { ats?: { overall: number } }
interface InterviewDoc { _id: string; role: string; date: string; scores: { overall: number } }

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeDoc | null>(null);
  const [interviews, setInterviews] = useState<InterviewDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/resumes/me'), api.get('/interviews/mine')])
      .then(([r, i]) => { setResume(r.data.resume); setInterviews(i.data.interviews); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const latest = interviews[0];
  const chartData = interviews.slice().reverse().map((r) => ({ date: new Date(r.date).toLocaleDateString(), score: r.scores?.overall ?? 0 }));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="font-display text-[26px] font-bold">{greeting}, {user?.name.split(' ')[0]}</h1>
        <p className="text-ink-500 text-[14px] mt-1">
          {resume ? "Here's where your profile stands right now." : 'Upload your resume to start your AI career analysis.'}
        </p>
      </div>

      {!resume ? (
        <EmptyState
          title="No resume uploaded yet"
          subtitle="Upload a PDF or DOCX to get your AI-based ATS score."
          action={<Link to="/resume" className="btn btn-primary">Upload resume</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="ATS Score" value={resume.ats?.overall ?? null} color="bg-indigo-500" />
            <StatCard label="Latest Interview Score" value={latest?.scores?.overall ?? null} color="bg-violet-600" />
            <div className="card p-5">
              <p className="text-[13px] font-semibold text-ink-500 mb-2">Interviews Completed</p>
              <p className="font-display text-[34px] font-bold mono">{interviews.length}</p>
            </div>
          </div>

          {interviews.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-display font-semibold text-[16px] mb-4">Performance over time</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#4338CA" strokeWidth={2.5} dot={{ r: 4, fill: '#4338CA' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card p-6 mb-6">
            <h3 className="font-display font-semibold text-[16px] mb-4">Recent interviews</h3>
            {interviews.length === 0 ? (
              <p className="text-ink-500 text-[13.5px]">
                No interviews completed yet. <Link to="/interview" className="text-indigo-600 font-semibold hover:underline">Start your first mock interview</Link>
              </p>
            ) : (
              interviews.slice(0, 5).map((r) => (
                <div key={r._id} className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
                  <div>
                    <p className="font-medium text-[13.5px]">{r.role}</p>
                    <p className="text-[12px] text-ink-500">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                  <span className="mono font-semibold text-[14px]">{r.scores?.overall ?? '—'}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/jobs" className="btn btn-secondary">Browse jobs</Link>
            <Link to="/interview" className="btn btn-primary">Practice another interview</Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] font-semibold text-ink-500 mb-2">{label}</p>
      <p className="font-display text-[34px] font-bold mono">{value ?? '—'}</p>
      <div className="h-1.5 bg-ink-100 rounded-full mt-3 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value || 0}%` }} />
      </div>
    </div>
  );
}
