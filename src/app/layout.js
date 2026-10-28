'use client';
import "./globals.css";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

export default function RootLayout({ children }) {
  const [theme, setTheme] = useState('light');
  const [empresa, setEmpresa] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('pslog-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
        if (data) setEmpresa(data);

        if (session) {
          setIsAuthenticated(true);
          const mail = (session.user?.email || 'Administrador').toLowerCase();
          setUserEmail(session.user?.email || 'Administrador');
          // Se for o usuário exclusivo do sogro (coleta@pslog.com), mantém apenas no aplicativo /app-coleta
          if (mail === 'coleta@pslog.com' && pathname !== '/app-coleta' && pathname !== '/' && pathname !== '/login') {
            router.push('/app-coleta');
          }
        } else {
          setIsAuthenticated(false);
          // Somente páginas internas do ERP redirecionam para /login
          if (pathname !== '/' && pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setSessionChecked(true);
      }
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user?.email || 'Administrador');
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
        if (pathname !== '/' && pathname !== '/login') {
          router.push('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('pslog-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isDark = theme === 'dark';

  const navItems = [
    { href: '/dashboard', label: 'Painel Executivo', icon: '📊', group: 'Visão Geral' },
    { href: '/coletas-gmax', label: 'Planilha Coletas GMAX', icon: '📑', group: 'Operação TMS' },
    { href: '/app-coleta', label: 'App Celular (Foto NF)', icon: '📲', group: 'Operação TMS' },
    { href: '/cotacoes', label: 'Cotações & Fretes', icon: '📋', group: 'Operação TMS' },
    { href: '/entregas', label: 'Torre de Entregas', icon: '🚚', group: 'Operação TMS' },
    { href: '/clientes', label: 'Clientes & Embarcadores', icon: '🏢', group: 'Cadastros' },
    { href: '/motoristas', label: 'Motoristas & Agregados', icon: '🪪', group: 'Cadastros' },
    { href: '/veiculos', label: 'Frota & Manutenção', icon: '🚛', group: 'Gestão de Frota' },
    { href: '/produtos', label: 'Almoxarifado & Peças', icon: '📦', group: 'Gestão de Frota' },
    { href: '/financeiro', label: 'Contas a Pagar & Receber', icon: '💰', group: 'Financeiro ERP' },
    { href: '/relatorios', label: 'DRE & Relatórios BI', icon: '📈', group: 'Financeiro ERP' },
    { href: '/configuracoes', label: 'Empresa & Parâmetros', icon: '⚙️', group: 'Sistema' }
  ];

  const fontHead = (
    <>
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" href="/pslog-icon-192.png" type="image/png" />
      <link rel="apple-touch-icon" href="/pslog-icon-192.png" />
      <meta name="theme-color" content="#107C41" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="PsLog" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
    </>
  );

  // 1. PÁGINA INICIAL PÚBLICA DE MARKETING (/) — SEMPRE ACESSÍVEL IMEDIATAMENTE SEM BLOQUEIO DE SESSÃO
  if (pathname === '/') {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <head>
          <title>{empresa?.nome_fantasia || 'PS Logística & Transportes'} | Transporte Rodoviário e Logística Integrada</title>
          {fontHead}
        </head>
        <body className="bg-[#060B18] text-slate-100 min-h-screen font-sans overflow-x-hidden">
          {children}
        </body>
      </html>
    );
  }

  // 2. PÁGINA DE LOGIN (/login) — CHAMADA QUANDO CLICA NO BOTÃO DE LOGIN NO TOPO DA TELA PRINCIPAL
  if (pathname === '/login') {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <head>
          <title>Acesso ao Portal ERP | PS Logística</title>
          {fontHead}
        </head>
        <body className="bg-[#060B18] text-white min-h-screen font-sans">
          {children}
        </body>
      </html>
    );
  }

  // 2.5 APLICATIVO MOBILE DE COLETA DE NF (/app-coleta) — TELA CHEIA LIMPA NO CELULAR SEM MENUS COMPLEXOS
  if (pathname === '/app-coleta') {
    return (
      <html lang="pt-BR" data-theme="dark">
        <head>
          <title>PsLog</title>
          {fontHead}
        </head>
        <body className="bg-[#060B18] text-white min-h-screen font-sans">
          {children}
        </body>
      </html>
    );
  }

  // 3. PÁGINAS INTERNAS DO ERP (/dashboard, /financeiro, /cotacoes, etc.)
  if (!sessionChecked || !isAuthenticated) {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <head>
          <title>PS Logística ERP</title>
          {fontHead}
        </head>
        <body className="bg-[#060B18] flex items-center justify-center h-screen font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl animate-bounce shadow-lg shadow-blue-500/30">
              PS
            </div>
            <div className="text-slate-400 animate-pulse text-sm">Verificando credenciais do ERP...</div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR" data-theme={theme}>
      <head>
        <title>{empresa?.nome_fantasia || 'PS LOGÍSTICA'} | ERP & TMS de Gestão de Transportes</title>
        {fontHead}
      </head>
      <body className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen overflow-hidden font-sans">
        <div className="flex h-full">
          {/* SIDEBAR CORPORATIVA */}
          <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-[280px] bg-[#060B18] text-white border-r border-slate-800/80 flex flex-col shadow-2xl z-40 transition-transform duration-200`}>
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {empresa?.logo_url ? (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                    <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/30 shrink-0">
                    {empresa?.nome_fantasia ? empresa.nome_fantasia.substring(0, 2).toUpperCase() : 'PS'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="m-0 text-sm font-black text-white truncate tracking-wide">
                    {empresa?.nome_fantasia || 'PS LOGÍSTICA'}
                  </h1>
                  <p className="m-0 text-[11px] text-blue-400 font-semibold truncate">ERP & TMS Corporativo</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            {/* NAVEGAÇÃO AGRUPADA */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item, idx) => {
                const showGroup = idx === 0 || navItems[idx - 1].group !== item.group;
                const isActive = pathname === item.href;
                return (
                  <div key={item.href}>
                    {showGroup && (
                      <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.group}
                      </p>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800/80 bg-[#030711] space-y-2">
              <Link
                href="/"
                className="w-full py-2 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>🌐</span> Ir para o Site Principal
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setIsAuthenticated(false);
                  router.push('/');
                }}
                className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <span>🚪</span> Sair do ERP
              </button>
            </div>
          </aside>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  ☰
                </button>
                <div>
                  <h2 className="m-0 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {navItems.find((i) => i.href === pathname)?.label || 'Central de Operações'}
                  </h2>
                  <p className="m-0 text-[11px] text-slate-400 hidden sm:block">
                    Gestão integrada de fretes, frota, motoristas e financeiro
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-5">
                <Link
                  href="/cotacoes"
                  className="hidden md:inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  + Nova Cotação
                </Link>
                <Link
                  href="/financeiro"
                  className="hidden md:inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  $ Contas Pagar/Receber
                </Link>

                <button
                  onClick={toggleTheme}
                  title="Alternar tema claro/escuro"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  {isDark ? '☀️' : '🌙'}
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <div className="text-right hidden sm:block">
                    <p className="m-0 text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {userEmail}
                    </p>
                    <p className="m-0 text-[11px] text-emerald-500 font-semibold">Administrador ERP</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    {empresa?.nome_fantasia ? empresa.nome_fantasia.substring(0, 2).toUpperCase() : 'PS'}
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
