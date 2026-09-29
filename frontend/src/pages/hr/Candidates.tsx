import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Avatar, StatusBadge, Spinner } from '../../components/ui';

interface Candidate {
  id: string; name: string; email: string; ats: number | null;
  interview: number | null; bestMatch: number | null; status: string;
}

const PER_PAGE = 8;

export default function HRCandidates() {
  const [all, setAll] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof Candidate>('name');
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/hr/candidates').then((res) => setAll(res.data.candidates)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = all.filter((c) =>
      (c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())) &&
      (!statusFilter || c.status === statusFilter)
    );
    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av > bv ? 1 : -1) * sortDir;
    });
    return list;
  }, [all, q, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function sortBy(key: keyof Candidate) {
    setSortDir((d) => (sortKey === key ? -d : 1));
    setSortKey(key);
    setPage(1);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[26px] font-bold">Candidates</h1>
          <p className="text-ink-500 text-[14px] mt-1">{all.length} registered candidate{all.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option>New</option><option>Applied</option><option>Shortlisted</option><option>Interviewing</option><option>Rejected</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left px-5 py-3 cursor-pointer" onClick={() => sortBy('name')}>Candidate</th>
                <th className="text-left px-5 py-3 cursor-pointer" onClick={() => sortBy('ats')}>ATS</th>
                <th className="text-left px-5 py-3 cursor-pointer" onClick={() => sortBy('bestMatch')}>Job Match</th>
                <th className="text-left px-5 py-3 cursor-pointer" onClick={() => sortBy('interview')}>Interview</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-14 text-ink-500">
                  <div className="text-[14px] font-semibold">No candidates found</div>
                  <div className="text-[13px] mt-1">Try adjusting your search or filters.</div>
                </td></tr>
              ) : (
                pageItems.map((c) => (
                  <tr key={c.id} className="row-hover border-b border-ink-100 last:border-0">
                    <td className="px-5 py-3.5"><Link to={`/hr/candidates/${c.id}`} className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><span className="font-medium">{c.name}</span></Link></td>
                    <td className="px-5 py-3.5 mono font-semibold">{c.ats ?? '—'}</td>
                    <td className="px-5 py-3.5 mono font-semibold">{c.bestMatch != null ? `${c.bestMatch}%` : '—'}</td>
                    <td className="px-5 py-3.5 mono font-semibold">{c.interview ?? '—'}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5"><Link to={`/hr/candidates/${c.id}`} className="btn btn-ghost !px-2 !py-1 text-[12.5px]">View</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-ink-100 text-[13px] text-ink-500">
          <span>{filtered.length ? `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length}` : 'No results'}</span>
          <div className="flex gap-2">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
