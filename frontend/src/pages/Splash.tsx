import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">

        <img
          src="/vettora-logo.png"
          alt="Vettora"
          className="w-[420px] max-w-[80vw] mx-auto"
        />

        <p className="mt-5 text-slate-500 text-base">
          AI-Powered Interview Analyser
        </p>

        <div className="mt-7 flex justify-center">
          <div className="w-9 h-9 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>

      </div>
    </div>
  );
}