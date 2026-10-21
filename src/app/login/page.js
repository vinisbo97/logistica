'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setEmpresa(data);
    });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      showMessage('error', 'Preencha seu e-mail corporativo e senha.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showMessage('success', 'Autenticação confirmada! Acessando o Painel ERP...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 700);
    } catch (error) {
      showMessage('error', 'Credenciais inválidas. Verifique seu e-mail e senha.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    if (!email) {
      showMessage('error', 'Informe seu e-mail corporativo para recuperação.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });

      if (error) throw error;

      showMessage('success', 'Instruções de redefinição enviadas para o seu e-mail!');
      setIsForgotPassword(false);
    } catch (error) {
      showMessage('error', 'Erro ao enviar e-mail de recuperação. Verifique o endereço.');
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4500);
  }

  const nomeEmpresa = empresa?.nome_fantasia || 'PS LOGÍSTICA';
  const telEmpresa = empresa?.telefone || '(11) 98765-4321';
  const emailEmpresa = empresa?.email || 'comercial@pslogistica.com.br';

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#060B18] text-white">
      {/* COLUNA ESQUERDA: IMAGEM DO CAMINHÃO + BRANDING CORPORATIVO */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden flex-col justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1800&q=85"
            alt="Caminhão PS Logística"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060B18] via-[#060B18]/75 to-[#060B18]/50" />
        </div>

        {/* TOPO DA IMAGEM */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/?site=1" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30">
              PS
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">{nomeEmpresa}</span>
              <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-widest">ERP & TMS Corporativo</span>
            </div>
          </Link>

          <Link
            href="/?site=1"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-xs font-bold text-white transition-all"
          >
            ← Voltar ao Site Institucional
          </Link>
        </div>

        {/* TEXTO CENTRAL / RODAPÉ DA IMAGEM */}
        <div className="relative z-10 space-y-6 max-w-xl">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md text-blue-300 text-xs font-bold uppercase tracking-wider">
            Plataforma de Gestão Integrada
          </span>
          <h2 className="text-4xl font-black leading-tight text-white">
            Controle total da sua frota, viagens e financeiro em um único lugar.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Gerencie cotações, ordens de coleta, manifestos de carga, manutenção de veículos, comissões de motoristas, contas a pagar/receber e DRE gerencial em tempo real.
          </p>

          <div className="pt-4 border-t border-white/15 flex flex-wrap gap-6 text-xs text-slate-300">
            <span>📞 Suporte & Comercial: <strong className="text-white">{telEmpresa}</strong></span>
            <span>✉️ <strong className="text-white">{emailEmpresa}</strong></span>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: FORMULÁRIO DE LOGIN DO ERP */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 bg-[#060B18]">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="flex items-center justify-between lg:hidden pb-4 border-b border-white/10">
            <span className="font-black text-lg text-white">{nomeEmpresa}</span>
            <Link href="/?site=1" className="text-xs text-blue-400 font-bold hover:underline">
              ← Voltar ao Site
            </Link>
          </div>

          <div className="space-y-2">
            <div className="inline-flex w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-600/30 mb-2">
              PS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {isForgotPassword ? 'Recuperar Acesso' : 'Acesso ao Portal ERP'}
            </h1>
            <p className="text-sm text-slate-400">
              {isForgotPassword
                ? 'Informe seu e-mail corporativo para receber o link de redefinição de senha.'
                : 'Entre com suas credenciais administrativas para acessar os módulos do sistema.'}
            </p>
          </div>

          {message.text && (
            <div className={`p-4 rounded-xl text-sm border font-medium ${message.type === 'success' ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200' : 'bg-rose-950/90 border-rose-700 text-rose-200'}`}>
              {message.text}
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">E-mail Corporativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@pslogistica.com.br"
                  className="w-full bg-[#0B132B] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">Senha de Acesso</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0B132B] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-extrabold transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? 'Autenticando no ERP...' : 'Entrar no Sistema ERP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">E-mail Cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@pslogistica.com.br"
                  className="w-full bg-[#0B132B] border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-extrabold transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
                >
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
            <span>🔒 Ambiente Criptografado</span>
            <Link href="/?site=1" className="text-blue-400 hover:underline font-semibold">
              Ir para o Site Público
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
