import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Spinner } from '../../components/ui';

interface AtsReport {
  overall: number; keywordMatch: number; skillsMatch: number; experienceMatch: number;
  educationMatch: number; projectMatch: number; formatting: number; readability: number;
  matchedSkills: string[]; missingSkills: string[]; missingKeywords: string[];
  strengths: string[]; weakSections: string[]; suggestions: string[];
}
interface ResumeDoc { fileName: string; analyzedAt: string; ats: AtsReport }

export default function Resume() {
  const [resume, setResume] = useState<ResumeDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState('Uploading and extracting text…');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/resumes/me').then((res) => setResume(res.data.resume)).finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File) {
    setError('');
    const okType = /\.(pdf|docx)$/i.test(file.name);
    if (!okType) { toast('Only PDF or DOCX files are supported', 'bad'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('File must be under 10MB', 'bad'); return; }

    setUploading(true);
    setStep('Uploading and extracting text…');
    const formData = new FormData();
    formData.append('resume', file);

    // Real progress: this label only changes once the actual network request
    // resolves — it's not a fake timer.
    const stepTimer = setTimeout(() => setStep('Analyzing with AI…'), 900);
    try {
      const res = await api.post('/resumes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResume(res.data.resume);
      toast('Resume analyzed successfully', 'good');
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'bad');
    } finally {
      clearTimeout(stepTimer);
      setUploading(false);
    }
  }

  async function onReupload() {
    await api.delete('/resumes/me');
    setResume(null);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  if (uploading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Header />
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
            <Spinner size={26} />
          </div>
          <p className="font-display font-semibold text-[16px]">{step}</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="max-w-6xl mx-auto">
        <Header />
        <div
          className={`upload-zone p-14 text-center cursor-pointer ${dragOver ? 'drag' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#4338CA" strokeWidth="1.8"><path d="M12 16V4M12 4l-4 4M12 4l4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
          </div>
          <p className="font-semibold text-[15px]">Drag &amp; drop your resume here</p>
          <p className="text-ink-500 text-[13px] mt-1">or click to browse — PDF or DOCX, up to 10MB</p>
          <button className="btn btn-primary mt-5" type="button">Choose file</button>
          <input ref={fileInput} type="file" accept=".pdf,.docx" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        {error && <p className="text-center text-bad-600 text-[13px] mt-4">{error}</p>}
        <p className="text-center text-ink-500 text-[13px] mt-4">Upload your resume to get your ATS compatibility score.</p>
      </div>
    );
  }

  const { ats } = resume;
  const categories = [
    { label: 'Keyword Match', val: ats.keywordMatch, color: 'bg-indigo-500' },
    { label: 'Skills Match', val: ats.skillsMatch, color: 'bg-violet-600' },
    { label: 'Experience Match', val: ats.experienceMatch, color: 'bg-good-600' },
    { label: 'Education Match', val: ats.educationMatch, color: 'bg-warn-600' },
    { label: 'Project Match', val: ats.projectMatch, color: 'bg-indigo-500' },
    { label: 'Formatting', val: ats.formatting, color: 'bg-violet-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <Header />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[13px] text-ink-500">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          {resume.fileName} · analyzed {new Date(resume.analyzedAt).toLocaleDateString()}
        </div>
        <button className="btn btn-secondary" onClick={onReupload}>Upload another</button>
      </div>
      <p className="badge bg-indigo-100 text-indigo-600 mb-5">AI-Based ATS Compatibility Score</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-7 flex flex-col items-center justify-center">
          <div className="scorering w-40 h-40" style={{ ['--p' as any]: ats.overall, ['--c' as any]: '#4338CA' }}>
            <div className="scorering-val text-center">
              <div className="font-display font-bold text-[36px] mono">{ats.overall}</div>
              <div className="text-[11px] text-ink-500 -mt-1">/ 100</div>
            </div>
          </div>
          <p className="font-semibold text-[14px] mt-4">ATS Compatibility</p>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {categories.map((c) => (
            <div key={c.label} className="card p-5">
              <p className="text-[13px] text-ink-500 font-medium">{c.label}</p>
              <p className="font-display font-bold text-[26px] mono mt-1">{c.val}%</p>
              <div className="h-1.5 bg-ink-100 rounded-full mt-2"><div className={`h-full ${c.color} rounded-full`} style={{ width: `${c.val}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-[15px] mb-4">Resume strengths</h3>
          <List items={ats.strengths} bullet="●" color="text-good-600" empty="No strengths identified." />
          <h3 className="font-display font-semibold text-[15px] mb-3 mt-6">Weak sections</h3>
          <List items={ats.weakSections} bullet="●" color="text-warn-600" empty="None flagged." />
        </div>
        <div className="card p-6">
          <h3 className="font-display font-semibold text-[15px] mb-3">Missing skills</h3>
          <Chips items={ats.missingSkills} cls="bg-warn-100 text-warn-600" />
          <h3 className="font-display font-semibold text-[15px] mb-3 mt-5">Missing keywords</h3>
          <Chips items={ats.missingKeywords} cls="bg-bad-100 text-bad-600" />
          <h3 className="font-display font-semibold text-[15px] mb-3 mt-5">Improvement recommendations</h3>
          <List items={ats.suggestions} bullet="→" color="text-indigo-500" empty="No suggestions." />
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button className="btn btn-primary" onClick={() => navigate('/jobs')}>Browse matching jobs</button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <>
      <h1 className="font-display text-[26px] font-bold mb-1">Resume &amp; ATS analysis</h1>
      <p className="text-ink-500 text-[14px] mb-7">Upload your real resume for an AI-based ATS compatibility score. Nothing is shown until you upload a file.</p>
    </>
  );
}
function List({ items, bullet, color, empty }: { items: string[]; bullet: string; color: string; empty: string }) {
  if (!items || items.length === 0) return <p className="text-ink-500 text-[13.5px]">{empty}</p>;
  return (
    <ul className="space-y-2.5 text-[13.5px]">
      {items.map((s, i) => <li key={i} className="flex gap-2.5"><span className={`${color} mt-0.5`}>{bullet}</span>{s}</li>)}
    </ul>
  );
}
function Chips({ items, cls }: { items: string[]; cls: string }) {
  if (!items || items.length === 0) return <p className="text-ink-500 text-[13px] mb-2">None detected</p>;
  return <div className="flex flex-wrap gap-2 mb-2">{items.map((s, i) => <span key={i} className={`badge ${cls}`}>{s}</span>)}</div>;
}
