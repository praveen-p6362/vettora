import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { EmptyState, Spinner } from '../../components/ui';

interface Job { _id: string; title: string; company: string }
interface Question { round: string; tag: string; text: string; answer: string }
interface InterviewDoc { _id: string; role: string; questions: Question[] }

type Stage = 'setup' | 'permissions' | 'generating' | 'active' | 'evaluating' | 'no-resume';

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { jobId?: string } };
  const [stage, setStage] = useState<Stage>('setup');
  const [checkingResume, setCheckingResume] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState(location.state?.jobId || '');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(6);
  const [permError, setPermError] = useState('');
  const [genError, setGenError] = useState('');

  const [interview, setInterview] = useState<InterviewDoc | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get('/resumes/me').then((res) => {
      if (!res.data.resume) setStage('no-resume');
      setCheckingResume(false);
    });
    api.get('/jobs').then((res) => setJobs(res.data.jobs));
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startFlow() {
    setPermError('');
    setStage('permissions');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
    } catch (err: any) {
      let msg = 'Could not access your camera or microphone.';
      if (err.name === 'NotAllowedError') msg = 'Camera and microphone permission is required for the video interview.';
      else if (err.name === 'NotFoundError') msg = 'No camera or microphone was found on this device.';
      setPermError(msg);
      setStage('setup');
      return;
    }

    setStage('generating');
    setGenError('');
    try {
      const res = await api.post('/interviews/generate', { jobId: jobId || undefined, difficulty, count });
      setInterview(res.data.interview);
      setQIndex(0);
      setAnswer('');
      setStage('active');
      startTimer();
    } catch (err: any) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setGenError(err.message);
      setStage('setup');
    }
  }

  useEffect(() => {
    if (stage === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(120);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { nextQuestion(); return 120; }
        return t - 1;
      });
    }, 1000);
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (!recording) {
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
      let finalText = answer;
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += (finalText ? ' ' : '') + e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        setAnswer((finalText + ' ' + interim).trim());
      };
      rec.start();
      recognitionRef.current = rec;
      setRecording(true);
    } else {
      recognitionRef.current?.stop();
      setRecording(false);
    }
  }

  async function saveAnswer() {
    if (!interview) return;
    await api.patch(`/interviews/${interview._id}/answer`, { questionIndex: qIndex, answer });
  }

  async function nextQuestion() {
    if (!interview) return;
    await saveAnswer();
    if (recording) { recognitionRef.current?.stop(); setRecording(false); }
    if (timerRef.current) clearInterval(timerRef.current);

    if (qIndex + 1 >= interview.questions.length) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStage('evaluating');
      try {
        const res = await api.post(`/interviews/${interview._id}/finish`);
        navigate('/reports', { state: { interviewId: res.data.interview._id } });
      } catch (err: any) {
        setGenError(err.message);
        setStage('active');
      }
      return;
    }
    setQIndex((i) => i + 1);
    setAnswer('');
    startTimer();
  }

  if (checkingResume) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;

  if (stage === 'no-resume') {
    return (
      <EmptyState
        title="Upload your resume first"
        subtitle="The AI generates interview questions based on your real skills and experience."
        action={<button className="btn btn-primary" onClick={() => navigate('/resume')}>Go to Resume &amp; ATS</button>}
      />
    );
  }

  if (stage === 'evaluating') {
    return (
      <div className="max-w-4xl mx-auto card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5"><Spinner size={26} /></div>
        <p className="font-display font-semibold text-[16px]">Evaluating your answers…</p>
      </div>
    );
  }

  if (stage === 'permissions' || stage === 'generating') {
    return (
      <div className="max-w-4xl mx-auto card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5"><Spinner size={26} /></div>
        <p className="font-display font-semibold text-[16px]">
          {stage === 'permissions' ? 'Requesting camera and microphone access…' : 'Generating interview questions from your resume…'}
        </p>
      </div>
    );
  }

  if (stage === 'active' && interview) {
    const q = interview.questions[qIndex];
    const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const ss = String(timeLeft % 60).padStart(2, '0');
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-ink-500">Question <span className="mono">{qIndex + 1}</span> of <span className="mono">{interview.questions.length}</span></span>
          <div className="flex items-center gap-2 text-[13px] font-semibold mono">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            {mm}:{ss}
          </div>
        </div>
        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(qIndex / interview.questions.length) * 100}%` }} />
        </div>
        <div className="card p-7 mb-5">
          <span className="badge bg-violet-100 text-violet-600 mb-3">{q.round} · {q.tag}</span>
          <p className="font-display font-semibold text-[19px] leading-snug">{q.text}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 card p-5">
            <label className="text-[13px] font-semibold text-ink-500 mb-2 block">Your answer</label>
            <textarea className="input h-40 resize-none" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <button className="btn btn-secondary" disabled={!speechSupported} onClick={toggleVoice}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" /></svg>
                {recording ? 'Stop recording' : 'Start recording'}
              </button>
              <div className="flex gap-3">
                <button className="btn btn-secondary" onClick={saveAnswer}>Submit answer</button>
                <button className="btn btn-primary" onClick={nextQuestion}>{qIndex === interview.questions.length - 1 ? 'Finish interview' : 'Next question →'}</button>
              </div>
            </div>
            {!speechSupported && <p className="text-[11.5px] text-ink-500 mt-2">Live speech-to-text isn't supported in this browser — type your answer instead.</p>}
          </div>
          <div className="card p-4 flex flex-col items-center">
            <div className="w-full aspect-video bg-ink-900 rounded-xl overflow-hidden relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {recording && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/50 rounded-full px-2 py-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full pulse-dot" />
                  <span className="text-white text-[11px] font-semibold">REC</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-ink-500 mt-2">🎤 Microphone: Connected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-display text-[26px] font-bold mb-1">Mock interview</h1>
      <p className="text-ink-500 text-[14px] mb-7">Answer with your real camera and microphone. Questions are generated from your resume.</p>
      <div className="card p-6 mb-5">
        {permError && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{permError}</div>}
        {genError && <div className="mb-4 text-[13px] text-bad-600 bg-bad-100 rounded-lg px-3 py-2">{genError}</div>}
        <label className="text-[13px] font-semibold block mb-1.5">Target role (optional)</label>
        <select className="input mb-4" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">General interview (based on resume only)</option>
          {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} — {j.company}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[13px] font-semibold block mb-1.5">Difficulty</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-semibold block mb-1.5">Number of questions</label>
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={5}>5</option><option value={6}>6</option><option value={8}>8</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary w-full justify-center" onClick={startFlow}>Start mock interview</button>
      </div>
    </div>
  );
}
