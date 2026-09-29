import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Spinner } from '../../components/ui';

interface QA { round: string; tag: string; text: string; answer: string; score: number | null; feedback: string }
interface InterviewDoc {
  _id: string; role: string; company?: string; date: string;
  questions: QA[];
  scores: { technical: number; communication: number; confidence: number; problemSolving: number; overall: number };
  strengths: string[]; weaknesses: string[]; recommendation: string;
}

export default function Reports() {
  const { user } = useAuth();
  const location = useLocation() as { state?: { interviewId?: string } };
  const [interviews, setInterviews] = useState<InterviewDoc[]>([]);
  const [current, setCurrent] = useState<InterviewDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/interviews/mine').then((res) => {
      const list: InterviewDoc[] = res.data.interviews;
      setInterviews(list);
      const preferred = location.state?.interviewId ? list.find((r) => r._id === location.state!.interviewId) : list[0];
      setCurrent(preferred || list[0] || null);
      setLoading(false);
    });
  }, []);

  async function downloadPdf(report: InterviewDoc) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Aptura AI — Interview Report', 20, 20);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Candidate: ' + (user?.name || ''), 20, 32);
    doc.text('Role: ' + report.role, 20, 39);
    doc.text('Date: ' + new Date(report.date).toLocaleDateString(), 20, 46);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(`Overall Score: ${report.scores.overall} / 100`, 20, 60);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    let y = 72;
    Object.entries(report.scores).forEach(([k, v]) => { if (k !== 'overall') { doc.text(`${k}: ${v}`, 20, y); y += 8; } });
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.text('AI Recommendation', 20, y); y += 8;
    doc.setFont('helvetica', 'normal');
    const rec = doc.splitTextToSize(report.recommendation || '—', 170);
    doc.text(rec, 20, y);
    doc.save('Aptura_Interview_Report.pdf');
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  if (!current) {
    return (
      <EmptyState
        title="No interviews completed yet"
        subtitle="Start your first AI mock interview to see your report here."
        action={<button className="btn btn-primary" onClick={() => navigate('/interview')}>Start mock interview</button>}
      />
    );
  }

  const s = current.scores;
  const items = [
    { label: 'Technical', val: s.technical, color: '#4338CA' },
    { label: 'Communication', val: s.communication, color: '#7C3AED' },
    { label: 'Confidence', val: s.confidence, color: '#059669' },
    { label: 'Problem Solving', val: s.problemSolving, color: '#D97706' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold">Interview report</h1>
          <p className="text-ink-500 text-[14px] mt-1">{user?.name} · {current.role} · {new Date(current.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          {interviews.length > 1 && (
            <select className="input" value={current._id} onChange={(e) => setCurrent(interviews.find((r) => r._id === e.target.value) || null)}>
              {interviews.map((r) => <option key={r._id} value={r._id}>{r.role} — {new Date(r.date).toLocaleDateString()}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => downloadPdf(current)}>Download PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-7 flex flex-col items-center justify-center">
          <div className="scorering w-36 h-36" style={{ ['--p' as any]: s.overall, ['--c' as any]: '#4338CA' }}>
            <div className="scorering-val text-center">
              <div className="font-display font-bold text-[32px] mono">{s.overall}</div>
              <div className="text-[11px] text-ink-500 -mt-1">/ 100</div>
            </div>
          </div>
          <p className="font-semibold text-[14px] mt-3">Overall Score</p>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map((i) => (
            <div key={i.label} className="card p-4">
              <p className="text-[12px] text-ink-500 font-medium">{i.label}</p>
              <p className="font-display font-bold text-[22px] mono mt-1">{i.val}</p>
              <div className="h-1.5 bg-ink-100 rounded-full mt-2"><div className="h-full rounded-full" style={{ width: `${i.val}%`, background: i.color }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-[15px] mb-4 text-good-600">Strengths</h3>
          {current.strengths.length ? (
            <ul className="space-y-2.5 text-[13.5px]">{current.strengths.map((x, i) => <li key={i} className="flex gap-2.5"><span className="text-good-600">●</span>{x}</li>)}</ul>
          ) : <p className="text-ink-500 text-[13.5px]">None recorded.</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-display font-semibold text-[15px] mb-4 text-warn-600">Areas for improvement</h3>
          {current.weaknesses.length ? (
            <ul className="space-y-2.5 text-[13.5px]">{current.weaknesses.map((x, i) => <li key={i} className="flex gap-2.5"><span className="text-warn-600">●</span>{x}</li>)}</ul>
          ) : <p className="text-ink-500 text-[13.5px]">None recorded.</p>}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-display font-semibold text-[15px] mb-4">AI recommendation</h3>
        <p className="text-[13.5px] text-ink-700 leading-relaxed">{current.recommendation || 'No recommendation generated.'}</p>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold text-[15px] mb-4">Question-by-question analysis</h3>
        <div className="divide-y divide-ink-100">
          {current.questions.map((q, i) => <QARow key={i} index={i} q={q} />)}
        </div>
      </div>
    </div>
  );
}

function QARow({ index, q }: { index: number; q: QA }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between cursor-pointer gap-3" onClick={() => setOpen((o) => !o)}>
        <p className="font-medium text-[13.5px] pr-4">{index + 1}. [{q.round}] {q.text}</p>
        <span className="badge bg-indigo-100 text-indigo-600 shrink-0">{q.score ?? '—'}</span>
      </div>
      {open && (
        <div className="mt-2">
          <p className="text-[13px] text-ink-500"><strong>Your answer:</strong> {q.answer || '(no answer given)'}</p>
          <p className="text-[13px] text-ink-500 mt-1"><strong>Feedback:</strong> {q.feedback || '—'}</p>
        </div>
      )}
    </div>
  );
}
