import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { EmptyState, Spinner } from '../../components/ui';

interface Job {
  _id: string; company: string; title: string; description: string;
  requiredSkills: string[]; preferredSkills: string[]; experience: string;
  education: string; location: string; employmentType: string;
}

export default function HRJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  function load() {
    setLoading(true);
    api.get('/jobs/mine').then((res) => setJobs(res.data.jobs)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onDelete(id: string) {
    await api.delete(`/jobs/${id}`);
    toast('Job deleted', 'info');
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold">Jobs</h1>
          <p className="text-ink-500 text-[14px] mt-1">Create and manage your open roles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Post a job</button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs posted yet" subtitle="Post your first role so candidates can apply and get matched." action={<button className="btn btn-primary" onClick={() => setModalOpen(true)}>Post a job</button>} />
      ) : (
        jobs.map((j) => (
          <div key={j._id} className="card p-6 mb-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="font-display font-semibold text-[16px]">{j.title}</p>
                <p className="text-[13px] text-ink-500 mt-0.5">{j.company} · {j.location || '—'} · {j.employmentType}</p>
              </div>
              <button className="btn btn-danger" onClick={() => onDelete(j._id)}>Delete</button>
            </div>
            <p className="text-[13.5px] text-ink-700 mt-3">{j.description.slice(0, 200)}{j.description.length > 200 ? '…' : ''}</p>
            <div className="flex flex-wrap gap-2 mt-3">{j.requiredSkills.map((s) => <span key={s} className="badge bg-indigo-100 text-indigo-600">{s}</span>)}</div>
          </div>
        ))
      )}

      {modalOpen && <JobModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); toast('Job posted', 'good'); load(); }} />}
    </div>
  );
}

function JobModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title || !company || !description) { setError('Title, company and description are required'); return; }
    setBusy(true);
    try {
      await api.post('/jobs', {
        company, title, description,
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        preferredSkills: preferredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        experience, education, location, employmentType,
      });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-scrim open">
      <div className="modal">
        <h3 className="font-display font-bold text-[17px] mb-4">Post a job</h3>
        {error && <div className="mb-3 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="input" placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <textarea className="input h-24 resize-none mb-3" placeholder="Job description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Required skills (comma-separated)" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} />
            <input className="input" placeholder="Preferred skills (comma-separated)" value={preferredSkills} onChange={(e) => setPreferredSkills(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Experience (e.g. 3-5 years)" value={experience} onChange={(e) => setExperience(e.target.value)} />
            <input className="input" placeholder="Education requirement" value={education} onChange={(e) => setEducation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
            <select className="input" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Remote</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
