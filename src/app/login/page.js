'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      showMessage('error', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      showMessage('success', 'Login realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);

    } catch (error) {
      showMessage('error', 'Erro ao fazer login. Verifique seu e-mail e senha.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Logo / Título */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30 mb-2">
            PS
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PS LOGÍSTICA</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Entre com sua conta para acessar o sistema</p>
        </div>

        {/* Mensagem de Erro/Sucesso */}
        {message.text && (
          <div className={`p-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@pslog.com"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400">Sistema Restrito a Funcionários e Administradores</p>
        </div>
      </div>
    </div>
  );
}